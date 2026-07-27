import path from "node:path";
import { ProjectSeedPort } from "../application/ports/project-seed.mjs";

export class ConfiguredProjectSeed extends ProjectSeedPort {
  constructor({ genericEnginesRoot, dashboardRoot }) {
    super();
    this.genericEnginesRoot = path.resolve(genericEnginesRoot);
    this.dashboardRoot = path.resolve(dashboardRoot);
  }

  async projects() {
    const projectRoot = path.join(this.genericEnginesRoot, "engine_projects");
    return [
      {
        id: "requirement-engine",
        name: "Requirement Engine",
        type: "engine",
        label: "Engine",
        description: "需求澄清与 Contract",
        path: path.join(projectRoot, "requirement-engine"),
        url: "http://127.0.0.1:4317",
        port: 4317,
        command: "npm run dev",
        tags: ["需求", "Node.js"],
        pinned: false
      },
      {
        id: "price-intelligence-engine",
        name: "Price Intelligence",
        type: "candidate",
        label: "Candidate",
        description: "行情聚合、预测与告警",
        path: path.join(projectRoot, "price-intelligence-engine"),
        url: "http://127.0.0.1:5173",
        port: 5173,
        command: "npm run dev",
        tags: ["行情", "React"],
        pinned: false
      },
      {
        id: "kmp-feature-toolkit",
        name: "KMP Feature Toolkit",
        type: "tool",
        label: "Tool",
        description: "KMP/CMP Feature 脚手架",
        path: path.join(projectRoot, "kmp-feature-toolkit"),
        url: "",
        port: 0,
        command: "kmp-toolkit profiles",
        tags: ["KMP", "Python"],
        pinned: false
      },
      {
        id: "generic-engines",
        name: "Generic Engines",
        type: "workspace",
        label: "Workspace",
        description: "协议、架构与接入治理",
        path: this.genericEnginesRoot,
        url: "",
        port: 0,
        command: "npm run validate",
        tags: ["治理", "OpenSpec"],
        pinned: false
      },
      {
        id: "dashboard",
        name: "Dashboard Engine",
        type: "engine",
        label: "Engine",
        description: "当前路径、速记与项目入口目录",
        path: this.dashboardRoot,
        url: "http://127.0.0.1:4173",
        port: 4173,
        command: "npm start",
        tags: ["入口", "EngineMessage"],
        pinned: true
      }
    ];
  }
}
