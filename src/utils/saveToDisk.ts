// when the proccess stops save the queue to a file
import fs from "fs";
import { jobQueue, resumeJobs } from "../core/queue";

export function saveQueue() {
  try {
    if (jobQueue.length === 0) {
      if (fs.existsSync("queue.json")) fs.unlinkSync("queue.json");
      return;
    }
    const json = JSON.stringify(jobQueue, null, 2);
    fs.writeFileSync("queue.json", json);
  } catch (error) {
    console.error("Error saving queue:", error);
  }
}

export function loadQueue() {
  try {
    if (!fs.existsSync("queue.json")) return;
    const json = fs.readFileSync("queue.json", "utf-8");
    const jobs = JSON.parse(json);
    if (Array.isArray(jobs) && jobs.length > 0) {
      resumeJobs(jobs);
    }
    // Remove the file so it's not loaded again on next restart
    fs.unlinkSync("queue.json");
  } catch (error) {
    console.error("Error loading queue:", error);
  }
}
