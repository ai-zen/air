import { describe, it, expect } from "vitest";
import { shellTool } from "../tools.js";

describe("shellTool", () => {
  it("具有正确的名称和描述", () => {
    expect(shellTool.function.name).toBe("shell");
    expect(shellTool.function.description).toBe("执行 shell 命令并返回输出");
  });

  it("参数定义正确", () => {
    const params = shellTool.function.parameters;
    expect(params.properties.command.type).toBe("string");
    expect(params.required).toEqual(["command"]);
  });
});
