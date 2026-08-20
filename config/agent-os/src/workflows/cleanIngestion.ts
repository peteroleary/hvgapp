import { ownedBy, ownedBySystem, type WorkflowDefinition } from "./types.ts";

/**
 * Clean Startup Data Ingestion Flow:
 * Field Sensor Ingestion ➔ Slim ➔ Pata ➔ Training Pipeline.
 *
 * The spatial engine is the product here — turnover work generates the
 * chest-cam video, lapel audio, and LiDAR that trains the robotics model.
 */
export const CLEAN_INGESTION: WorkflowDefinition = {
  id: "clean-ingestion",
  name: "Clean Startup Data Ingestion Flow",
  scope: "clean",
  description:
    "Moves raw field sensor capture through spatial processing and benchmark verification into the robotics training pipeline.",
  initial: "ingest",
  states: [
    {
      id: "ingest",
      name: "Field Sensor Ingestion",
      owner: ownedBySystem("field-sensor-capture"),
      description:
        "Chest-cam video, lapel mic audio, and LiDAR point clouds land from the field.",
      on: { advance: "spatial", block: "ingest" },
      terminal: false,
    },
    {
      id: "spatial",
      name: "Spatial Processing",
      owner: ownedBy("slim"),
      description:
        "Slim segments room meshes, maps clean paths, and generates imitation-learning trajectories.",
      on: { advance: "verify", reject: "ingest" },
      terminal: false,
    },
    {
      id: "verify",
      name: "Benchmark Verification",
      owner: ownedBy("pata"),
      description:
        "Pata verifies output against competitive turnover standards and sensor hardware benchmarks, citing sources with dates.",
      on: { advance: "training", reject: "spatial" },
      terminal: false,
    },
    {
      id: "training",
      name: "Training Pipeline",
      owner: ownedBySystem("robotics-training-pipeline"),
      description:
        "Verified trajectories are handed to the robotics training pipeline.",
      on: {},
      terminal: true,
    },
  ],
};
