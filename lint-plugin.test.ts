import { assert, assertEquals } from "jsr:@std/assert";
import plugin, {
  is_screaming_snake_cased,
  is_snake_cased,
  is_underscored,
  is_upper_camel_cased,
  to_camel_case,
  to_hint,
  to_message,
  to_snake_case,
  to_upper_camel_case,
} from "./lint-plugin.ts";

//todo: check fixes once they are correctly typed

const ID = "lint-plugin-rust-style/rust-style";

Deno.test("is_underscored", () => {
  const tests: [string, boolean][] = [
    ["foo_bar", true], //snake
    ["fooBar", false], //camel
    ["FooBar", false], //upper camel
    ["foo_bar_baz", true], //snake
    ["_foo_bar_baz", true], //snake
    ["__foo_bar_baz__", true], //snake
    ["__fooBar_baz__", true], //snake
    ["__fooBarBaz__", false], //camel
    ["Sha3_224", true], //not snake
    ["SHA3_224", false], //screaming snake
  ];

  for (const [input, expected] of tests) {
    assertEquals(expected, is_underscored(input));
  }
});

Deno.test("is_snake_cased", () => {
  const tests: [string, boolean][] = [
    ["foo_bar", true], //snake
    ["fooBar", false], //camel
    ["FooBar", false], //upper camel
    ["foo_bar_baz", true], //snake
    ["_foo_bar_baz", true], //snake
    ["__foo_bar_baz__", true], //snake
    ["__fooBar_baz__", false], //not snake
    ["__fooBarBaz__", false], //camel
    ["Sha3_224", false], //not snake
    ["SHA3_224", false], //screaming snake
  ];

  for (const [input, expected] of tests) {
    assertEquals(expected, is_snake_cased(input));
  }
});

Deno.test("is_screaming_snake_cased", () => {
  const tests: [string, boolean][] = [
    ["foo_bar", false], //snake
    ["fooBar", false], //camel
    ["FooBar", false], //upper camel
    ["foo_bar_baz", false], //snake
    ["_foo_bar_baz", false], //snake
    ["__foo_bar_baz__", false], //snake
    ["__fooBar_baz__", false], //not snake
    ["__fooBarBaz__", false], //camel
    ["Sha3_224", false], //not snake
    ["SHA3_224", true], //screaming snake
  ];

  for (const [input, expected] of tests) {
    assertEquals(expected, is_screaming_snake_cased(input));
  }
});

Deno.test("is_upper_camel_cased", () => {
  const tests: [string, boolean][] = [
    ["foo_bar", false], //snake
    ["fooBar", false], //camel
    ["FooBar", true], //upper camel
    ["foo_bar_baz", false], //snake
    ["_foo_bar_baz", false], //snake
    ["__foo_bar_baz__", false], //snake
    ["__fooBar_baz__", false], //not snake
    ["__fooBarBaz__", false], //camel
    ["Sha3_224", false], //not snake
    ["SHA3_224", true], //screaming snake; todo: ?should this be true?
  ];

  for (const [input, expected] of tests) {
    assertEquals(expected, is_upper_camel_cased(input));
  }
});

Deno.test("to_camel_case", () => {
  const tests: [string, string][] = [
    ["foo_bar", "fooBar"],
    ["fooBar", "fooBar"],
    ["FooBar", "FooBar"],
    ["foo_bar_baz", "fooBarBaz"],
    ["_foo_bar_baz", "_fooBarBaz"],
    ["__foo_bar_baz__", "__fooBarBaz__"],
    ["Sha3_224", "SHA3_224"],
    ["SHA3_224", "SHA3_224"],
    ["_leading", "_leading"],
    ["trailing_", "trailing_"],
    ["_bothEnds_", "_bothEnds_"],
  ];

  for (const [input, expected] of tests) {
    assertEquals(expected, to_camel_case(input));
  }
});

Deno.test("to_snake_case", () => {
  const tests: [string, string][] = [
    ["fooBar", "foo_bar"],
    ["foo_bar", "foo_bar"],
    ["FooBar", "foo_bar"],
    ["_FooBar", "_foo_bar"],
    ["fooBarBaz", "foo_bar_baz"],
    ["_fooBarBaz", "_foo_bar_baz"],
    ["__fooBarBaz__", "__foo_bar_baz__"],
    ["Sha3_224", "sha3_224"],
    ["SHA3_224", "sha3_224"],
    ["_leadingCamel", "_leading_camel"],
    ["trailingCamel_", "trailing_camel_"],
    ["_bothendsCamel_", "_bothends_camel_"],
  ];

  for (const [input, expected] of tests) {
    assertEquals(expected, to_snake_case(input));
  }
});

Deno.test("to_upper_camel_case", () => {
  const tests: [string, string][] = [
    ["foo_bar", "FooBar"],
    ["fooBar", "FooBar"],
    ["FooBar", "FooBar"],
    ["foo_bar_baz", "FooBarBaz"],
    ["_foo_bar_baz", "_FooBarBaz"],
    ["__foo_bar_baz__", "__FooBarBaz__"],
    ["Sha3_224", "SHA3_224"],
    ["SHA3_224", "SHA3_224"],
    ["_leading", "_Leading"],
    ["trailing_", "Trailing_"],
    ["_bothEnds_", "_BothEnds_"],
  ];

  for (const [input, expected] of tests) {
    assertEquals(expected, to_upper_camel_case(input));
  }
});

Deno.test("class prop valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "class Test { static STATIC_PROP_VALID = 1; prop_valid = 2; }",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("class prop invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "class Test { static staticPropInvalid = 1; propInvalid = 2; }",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("staticPropInvalid"));
    assertEquals(d.hint, to_hint("staticPropInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("propInvalid"));
    assertEquals(d.hint, to_hint("propInvalid", "variable"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("class method valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "class Test { static static_method_valid() {} method_valid() {} }",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("class method invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "class Test { static staticMethodInvalid() {} methodInvalid() {} #methodInvalid() {} }",
  );

  assertEquals(diagnostics.length, 3);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("staticMethodInvalid"));
    assertEquals(d.hint, to_hint("staticMethodInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("methodInvalid"));
    assertEquals(d.hint, to_hint("methodInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[2];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("methodInvalid"));
    assertEquals(d.hint, to_hint("methodInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("function declaration valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "function function_valid() {}",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("function declaration invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "function functionInvalid() {}",
  );

  assertEquals(diagnostics.length, 1);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("functionInvalid"));
    assertEquals(d.hint, to_hint("functionInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("JSX component declaration valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "function Component(): JSX.Element {}",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("JSX component declaration invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "function Component() {}",
  );

  assertEquals(diagnostics.length, 1);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("Component"));
    assertEquals(d.hint, to_hint("Component", "function"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("class declaration valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "class ClassValid {}",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("class declaration invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "class class_invalid {}",
  );

  assertEquals(diagnostics.length, 1);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("class_invalid"));
    assertEquals(d.hint, to_hint("class_invalid", "class"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable declaration valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const variable_valid1 = 1; let variable_valid2 = 2; var variable_valid3 = 3; const CONSTANT_VALID = 4;",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable declaration invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const variableInvalid1 = 1; let variableInvalid2 = 2; var variableInvalid3 = 3;",
  );

  assertEquals(diagnostics.length, 3);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("variableInvalid1"));
    assertEquals(d.hint, to_hint("variableInvalid1", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("variableInvalid2"));
    assertEquals(d.hint, to_hint("variableInvalid2", "variable"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[2];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("variableInvalid3"));
    assertEquals(d.hint, to_hint("variableInvalid3", "variable"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable function declaration valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const func_valid = function () { }; const FuncValid = function (): JSX.Element { }; let FuncValid = function (): JSX.Element { };",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable function declaration invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const funcInvalid = function () { }; const func_invalid = function (): JSX.Element { };",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("funcInvalid"));
    assertEquals(d.hint, to_hint("funcInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("func_invalid"));
    assertEquals(d.hint, to_hint("func_invalid", "component"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable arrow function declaration valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const func_valid = () => { }; const FuncValid = (): JSX.Element => { }; let FuncValid = (): JSX.Element => { };",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable arrow function declaration invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const funcInvalid = () => { }; const func_invalid = (): JSX.Element => { };",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("funcInvalid"));
    assertEquals(d.hint, to_hint("funcInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("func_invalid"));
    assertEquals(d.hint, to_hint("func_invalid", "component"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable array pattern valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const [a_valid, b_valid = 2, ...rest_valid] = arr;",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable array pattern invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const [aInvalid, bInvalid = 2, ...restInvalid] = arr;",
  );

  assertEquals(diagnostics.length, 3);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("aInvalid"));
    assertEquals(d.hint, to_hint("aInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("bInvalid"));
    assertEquals(d.hint, to_hint("bInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[2];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("restInvalid"));
    assertEquals(d.hint, to_hint("restInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable object pattern valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const {a_valid, b_valid = 2, cValid: c_valid, dValid: d_valid = 4, ...rest_valid} = obj;",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable object pattern invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const {aValid, bInvalid = 2, cValid: cInvalid, dValid: dInvalid = 4, ...restInvalid} = obj;",
  );

  assertEquals(diagnostics.length, 4);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("bInvalid"));
    assertEquals(
      d.hint,
      to_hint("bInvalid", {
        key_name: "bInvalid",
        value_name: null,
        has_default: true,
        in_var_declarator: true,
      }),
    );
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("cInvalid"));
    assertEquals(
      d.hint,
      to_hint("cInvalid", {
        key_name: "cValid",
        value_name: "cInvalid",
        has_default: false,
        in_var_declarator: true,
      }),
    );
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[2];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("dInvalid"));
    assertEquals(
      d.hint,
      to_hint("dInvalid", {
        key_name: "dValid",
        value_name: "dInvalid",
        has_default: true,
        in_var_declarator: true,
      }),
    );
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[3];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("restInvalid"));
    assertEquals(d.hint, to_hint("restInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable nested array pattern valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const [[a_valid], { bValid }, ...[rest_valid]] = arr;",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable nested array pattern invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const [[aInvalid], { bValid }, ...[restInvalid]] = arr;",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("aInvalid"));
    assertEquals(d.hint, to_hint("aInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("restInvalid"));
    assertEquals(d.hint, to_hint("restInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable nested object pattern valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const {aValid: { b_valid }, cValid: [d_valid]} = obj;",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable nested object pattern invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const {aValid: { bValid: cInvalid }, dValid: [eInvalid]} = obj;",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("cInvalid"));
    assertEquals(
      d.hint,
      to_hint("cInvalid", {
        key_name: "bValid",
        value_name: "cInvalid",
        has_default: false,
        in_var_declarator: true,
      }),
    );
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("eInvalid"));
    assertEquals(d.hint, to_hint("eInvalid", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable function init valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const func_valid = function still_valid() { };",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable function init invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const func_valid = function stillInvalid() { };",
  );

  assertEquals(diagnostics.length, 1);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("stillInvalid"));
    assertEquals(d.hint, to_hint("stillInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable class init valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const ClassValid = class StillValid { };",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable class init invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const class_invalid = class still_invalid { };",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("still_invalid"));
    assertEquals(d.hint, to_hint("still_invalid", "class"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("class_invalid"));
    assertEquals(d.hint, to_hint("class_invalid", "class"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("variable object init valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    'const obj = {a_valid, b_valid: 2, "cValid": 3, ...rest_valid};',
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("variable object init invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "const obj = {aInvalid, bInvalid: 2, ...restValid};",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("aInvalid"));
    assertEquals(d.hint, to_hint("aInvalid", "object_key_shorthand"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("bInvalid"));
    assertEquals(d.hint, to_hint("bInvalid", "object_key"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("function param valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    'function func_valid(param_valid, { key_valid: [arr_valid], "keyValid": [arr_valid] }, ...rest_valid) { }',
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("function param invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "function func_valid(paramInvalid, { keyIrrelevant: [arrInvalid], ...restInvalid }, ...argsInvalid) {}",
  );

  assertEquals(diagnostics.length, 4);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("paramInvalid"));
    assertEquals(d.hint, to_hint("paramInvalid", "variable"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("arrInvalid"));
    assertEquals(d.hint, to_hint("arrInvalid", "variable"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[2];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("restInvalid"));
    assertEquals(d.hint, to_hint("restInvalid", "variable"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[3];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("argsInvalid"));
    assertEquals(d.hint, to_hint("argsInvalid", "variable"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("function param object destruct invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    'function func({ camelCase }) { } function func({ camelCase = "default value" }) { }',
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("camelCase"));
    assertEquals(
      d.hint,
      to_hint("camelCase", {
        key_name: "camelCase",
        value_name: null,
        has_default: false,
        in_var_declarator: false,
      }),
    );
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("camelCase"));
    assertEquals(
      d.hint,
      to_hint("camelCase", {
        key_name: "camelCase",
        value_name: null,
        has_default: true,
        in_var_declarator: false,
      }),
    );
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("function expression param valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "test(function ({ param_valid }) { }); test(({ param_valid }) => { });",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("function expression param invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "test(function ({ paramInvalid }) { }); test(({ paramInvalid }) => { });",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("paramInvalid"));
    assertEquals(d.hint, to_hint("paramInvalid", "variable"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("paramInvalid"));
    assertEquals(d.hint, to_hint("paramInvalid", "variable"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("type alias valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "type ValidType = { prop_valid: number, method_valid(): void };",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("type alias invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "type invalidType = { propInvalid: number, methodInvalid(): void };",
  );

  assertEquals(diagnostics.length, 3);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("invalidType"));
    assertEquals(d.hint, to_hint("invalidType", "type_alias"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("propInvalid"));
    assertEquals(d.hint, to_hint("propInvalid", "object_key"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[2];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("methodInvalid"));
    assertEquals(d.hint, to_hint("methodInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("interface valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "interface ValidInterface { prop_valid: number, method_valid(): void };",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("interface invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "interface invalidInterface { propInvalid: number, methodInvalid(): void };",
  );

  assertEquals(diagnostics.length, 3);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("invalidInterface"));
    assertEquals(d.hint, to_hint("invalidInterface", "interface"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("propInvalid"));
    assertEquals(d.hint, to_hint("propInvalid", "object_key"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[2];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("methodInvalid"));
    assertEquals(d.hint, to_hint("methodInvalid", "function"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("enum valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "enum ValidEnum { VariantValid: 1};",
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("enum invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    "enum invalidEnum { variantInvalid: 1};",
  );

  assertEquals(diagnostics.length, 2);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("invalidEnum"));
    assertEquals(d.hint, to_hint("invalidEnum", "enum_name"));
    assert(typeof d.fix !== "undefined");
  }
  {
    const d = diagnostics[1];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("variantInvalid"));
    assertEquals(d.hint, to_hint("variantInvalid", "enum_variant"));
    assert(typeof d.fix !== "undefined");
  }
});

Deno.test("export all valid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    'export * as snake_cased from "mod.ts"; export * as SCREAMING_SNAKE_CASED from "mod.ts";',
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("export all invalid", () => {
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "main.tsx",
    'export * as camelCased from "mod.ts";',
  );

  assertEquals(diagnostics.length, 1);
  {
    const d = diagnostics[0];
    assertEquals(d.id, ID);
    assertEquals(d.message, to_message("camelCased"));
    assertEquals(d.hint, to_hint("camelCased", "variable_or_constant"));
    assert(typeof d.fix !== "undefined");
  }
});
