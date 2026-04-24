import { createDatabaseSqlClient } from "@/db";
import {
  QUIZ_ATTEMPT_GRADING_CHANNEL,
  QUIZ_ATTEMPT_GRADING_RECONCILE_INTERVAL_MS,
} from "@/lib/quiz/attempts/constants";
import {
  processNextQuizAttemptJob,
  type ProcessNextQuizAttemptJobResult,
} from "@/lib/quiz/attempts/service";
import {
  processNextQuizGenerationJob,
  QUIZ_GENERATION_CHANNEL,
  QUIZ_GENERATION_RECONCILE_INTERVAL_MS,
  type ProcessNextQuizGenerationJobResult,
} from "@/lib/quiz/generation/service";

const workerId = `${process.pid}-${crypto.randomUUID()}`;

function log(
  level: "info" | "error" | "warn",
  message: string,
  details?: object,
) {
  const timestamp = new Date().toISOString();
  const prefix = `[quiz-generation-worker][${timestamp}][${level}]`;

  if (details) {
    console[level](`${prefix} ${message}`, details);
    return;
  }

  console[level](`${prefix} ${message}`);
}

async function main() {
  const generationListener = createDatabaseSqlClient({
    max: 1,
    idle_timeout: 0,
  });
  const attemptListener = createDatabaseSqlClient({
    max: 1,
    idle_timeout: 0,
  });
  let isDraining = false;
  let isDrainingAttempts = false;

  async function drainJobs(source: string) {
    if (isDraining) {
      log("info", "Skipped drain because another drain is already running.", {
        source,
        workerId,
      });
      return;
    }

    isDraining = true;
    let processedCount = 0;

    log("info", "Starting job drain.", {
      source,
      workerId,
    });

    try {
      while (true) {
        const result: ProcessNextQuizGenerationJobResult =
          await processNextQuizGenerationJob(workerId, {
            onClaimed: (job) => {
              log("info", "Started quiz generation job.", {
                attempts: job.attempts,
                jobId: job.jobId,
                quizId: job.quizId,
                source,
                workerId,
              });
            },
          });

        if (!result.processed) {
          break;
        }

        processedCount += 1;

        if (result.outcome === "completed") {
          log("info", "Finished quiz generation job.", {
            jobId: result.jobId,
            processedCount,
            quizId: result.quizId,
            source,
            workerId,
          });
          continue;
        }

        log("warn", "Quiz generation job failed.", {
          errorMessage: result.errorMessage,
          jobId: result.jobId,
          processedCount,
          quizId: result.quizId,
          source,
          workerId,
        });
      }
    } catch (error) {
      log("error", "Failed to drain jobs.", {
        error,
        processedCount,
        source,
        workerId,
      });
    } finally {
      isDraining = false;
      log("info", "Finished job drain.", {
        processedCount,
        source,
        workerId,
      });
    }
  }

  async function drainAttemptJobs(source: string) {
    if (isDrainingAttempts) {
      log("info", "Skipped attempt drain because another drain is running.", {
        source,
        workerId,
      });
      return;
    }

    isDrainingAttempts = true;
    let processedCount = 0;

    log("info", "Starting attempt job drain.", {
      source,
      workerId,
    });

    try {
      while (true) {
        const result: ProcessNextQuizAttemptJobResult =
          await processNextQuizAttemptJob(workerId, {
            onClaimed: (job) => {
              log("info", "Started quiz attempt grading job.", {
                attemptId: job.attemptId,
                attempts: job.attempts,
                jobId: job.id,
                quizId: job.quizId,
                source,
                workerId,
              });
            },
          });

        if (!result.processed) break;

        processedCount += 1;

        if (result.outcome === "completed") {
          log("info", "Finished quiz attempt grading job.", {
            attemptId: result.attemptId,
            jobId: result.jobId,
            processedCount,
            quizId: result.quizId,
            source,
            workerId,
          });
          continue;
        }

        log("warn", "Quiz attempt grading job failed.", {
          attemptId: result.attemptId,
          errorMessage: result.errorMessage,
          jobId: result.jobId,
          processedCount,
          quizId: result.quizId,
          source,
          workerId,
        });
      }
    } catch (error) {
      log("error", "Failed to drain attempt jobs.", {
        error,
        processedCount,
        source,
        workerId,
      });
    } finally {
      isDrainingAttempts = false;
      log("info", "Finished attempt job drain.", {
        processedCount,
        source,
        workerId,
      });
    }
  }

  const reconcileTimer = setInterval(() => {
    void drainJobs("reconcile");
  }, QUIZ_GENERATION_RECONCILE_INTERVAL_MS);
  const attemptReconcileTimer = setInterval(() => {
    void drainAttemptJobs("reconcile");
  }, QUIZ_ATTEMPT_GRADING_RECONCILE_INTERVAL_MS);

  log("info", "Worker started.", {
    channel: QUIZ_GENERATION_CHANNEL,
    attemptChannel: QUIZ_ATTEMPT_GRADING_CHANNEL,
    reconcileIntervalMs: QUIZ_GENERATION_RECONCILE_INTERVAL_MS,
    attemptReconcileIntervalMs: QUIZ_ATTEMPT_GRADING_RECONCILE_INTERVAL_MS,
    workerId,
  });

  const generationSubscription = await generationListener.listen(
    QUIZ_GENERATION_CHANNEL,
    (payload) => {
      log("info", "Received LISTEN/NOTIFY wake-up.", {
        payload,
        workerId,
      });
      void drainJobs("notify");
    },
    () => {
      log("info", "Worker is listening for quiz generation notifications.", {
        channel: QUIZ_GENERATION_CHANNEL,
        workerId,
      });
      void drainJobs("startup-listen");
    },
  );
  const attemptSubscription = await attemptListener.listen(
    QUIZ_ATTEMPT_GRADING_CHANNEL,
    (payload) => {
      log("info", "Received attempt LISTEN/NOTIFY wake-up.", {
        payload,
        workerId,
      });
      void drainAttemptJobs("notify");
    },
    () => {
      log("info", "Worker is listening for attempt notifications.", {
        channel: QUIZ_ATTEMPT_GRADING_CHANNEL,
        workerId,
      });
      void drainAttemptJobs("startup-listen");
    },
  );

  const shutdown = async () => {
    log("info", "Shutting down worker.", {
      workerId,
    });
    clearInterval(reconcileTimer);
    clearInterval(attemptReconcileTimer);
    await generationSubscription.unlisten();
    await attemptSubscription.unlisten();
    await generationListener.end({ timeout: 5 });
    await attemptListener.end({ timeout: 5 });
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await drainJobs("startup");
  await drainAttemptJobs("startup");
  await new Promise(() => undefined);
}

void main().catch((error) => {
  log("error", "Fatal worker error.", {
    error,
    workerId,
  });
  process.exit(1);
});
