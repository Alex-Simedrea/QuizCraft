import { createDatabaseSqlClient } from "@/db";
import {
  type ProcessNextQuizGenerationJobResult,
  processNextQuizGenerationJob,
  QUIZ_GENERATION_CHANNEL,
  QUIZ_GENERATION_RECONCILE_INTERVAL_MS,
} from "@/lib/quiz-generation-service";

const workerId = `${process.pid}-${crypto.randomUUID()}`;

function log(level: "info" | "error" | "warn", message: string, details?: object) {
  const timestamp = new Date().toISOString();
  const prefix = `[quiz-generation-worker][${timestamp}][${level}]`;

  if (details) {
    console[level](`${prefix} ${message}`, details);
    return;
  }

  console[level](`${prefix} ${message}`);
}

async function main() {
  const listener = createDatabaseSqlClient({
    max: 1,
    idle_timeout: 0,
  });
  let isDraining = false;

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

  const reconcileTimer = setInterval(() => {
    void drainJobs("reconcile");
  }, QUIZ_GENERATION_RECONCILE_INTERVAL_MS);

  log("info", "Worker started.", {
    channel: QUIZ_GENERATION_CHANNEL,
    reconcileIntervalMs: QUIZ_GENERATION_RECONCILE_INTERVAL_MS,
    workerId,
  });

  const subscription = await listener.listen(
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

  const shutdown = async () => {
    log("info", "Shutting down worker.", {
      workerId,
    });
    clearInterval(reconcileTimer);
    await subscription.unlisten();
    await listener.end({ timeout: 5 });
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await drainJobs("startup");
  await new Promise(() => undefined);
}

void main().catch((error) => {
  log("error", "Fatal worker error.", {
    error,
    workerId,
  });
  process.exit(1);
});
