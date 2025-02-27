import { assert, assertEquals } from "jsr:@std/assert";
import plugin, { to_message } from "./lint-plugin.ts";

const ID = "lint-plugin-rust-style/rust-style";

Deno.test.ignore("valid assignment", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.ts",
    'valid_assignment = "Ichigo";',
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test.ignore("invalid assignment", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.ts",
    'invalidAssignment = "Ichigo";',
  );

  assertEquals(diagnostics.length, 1);
  const d = diagnostics[0];
  assertEquals(d.id, ID);
  assertEquals(d.message, to_message("invalidAssignment"));
  assert(typeof d.fix !== "undefined");
});

Deno.test("class prop valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.ts",
    "class Test { static STATIC_PROP_VALID = 1; prop_valid = 2; }",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("class prop invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.ts",
    "class Test { static staticPropInvalid = 1; propInvalid = 2; }",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("staticPropInvalid"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("propInvalid"));
    assert(typeof d.fix !== "undefined");
  }
});
