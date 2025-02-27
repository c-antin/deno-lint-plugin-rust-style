// deno-lint-ignore-file no-unused-vars no-inner-declarations verbatim-module-syntax

// invalid
export * as camelCased from "mod.ts";

function doSomething() {}
let firstName = "Ichigo";
firstName = "Ichigo";
const obj1 = { lastName: "Hoshimiya" };
const obj2 = { firstName };

class snake_case_class {}
class camelCaseClass {}
class Also_Not_Valid_Class {}

function foo({ camelCase = "default value" }) {}
function Component() {}
function component(): JSX.Element {}

enum snake_case_enum {
  snake_case_variant,
}

enum camelCasedEnum {
  camelCasedVariant,
}

type snake_case_type = { some_property: number };

type camelCasedType = { someProperty: number };

interface snake_case_interface {
  some_property: number;
}

interface camelCasedInterface {
  someProperty: number;
}

//valid
import { camelCased, JSX } from "external-module.js"; // valid, because one has no control over the identifier
import { camelCased as not_camel_cased } from "external-module.js";
export * as not_camel_cased from "mod.ts";

function do_something() {} // function declarations must be snake_case but...
doSomething(); // ...camel_case function calls are allowed
{
  let first_name = "Ichigo";
  first_name = "Ichigo";
  const FIRST_NAME = "Ichigo";
  const __my_private_variable = "Hoshimiya";
  const my_private_variable_ = "Hoshimiya";
  const obj1 = { "lastName": "Hoshimiya" }; // if an object key is wrapped in quotation mark, then it's valid
  const obj2 = { "firstName": firstName };
  const { lastName } = obj1; // valid, because one has no control over the identifier
  const { lastName: last_name } = obj1;

  function foo({ camelCase: snake_case = "default value" }) {}
  function Component(): JSX.Element {}

  class PascalCaseClass {}

  enum PascalCaseEnum {
    PascalCaseVariant,
  }

  type PascalCaseType = { some_property: number };

  interface PascalCaseInterface {
    some_property: number;
  }
}
