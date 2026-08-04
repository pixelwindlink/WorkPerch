export class PathInspectorPort {
  async inspect() {
    throw new Error("PathInspectorPort.inspect must be implemented.");
  }

  async inspectMany(paths) {
    return Promise.all(paths.map((path) => this.inspect(path)));
  }
}
