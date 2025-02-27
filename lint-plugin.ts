// loosely based on DestructuringFinder https://github.com/swc-project/swc/blob/e74929c01d2d8b9001bbc056f20ca8e1cb1c9a63/crates/swc_ecma_utils/src/lib.rs#L1520
const find_lhs_pat_ids = (
  arr: (
    | Deno.lint.Identifier
    | Deno.lint.ArrayPattern
    | Deno.lint.ObjectPattern
    | Deno.lint.MemberExpression
    | Deno.lint.AssignmentPattern
    | Deno.lint.RestElement
    | Deno.lint.Property
    | null
  )[],
): Deno.lint.Identifier[] => {
  return arr.flatMap((n) => {
    if (n === null) return [];
    switch (n.type) {
      case "Identifier":
        return [n];
      case "ArrayPattern":
        return find_lhs_pat_ids(n.elements);
      case "ObjectPattern":
        return find_lhs_pat_ids(n.properties);
      case "MemberExpression":
        //ignore member expression for now
        return [];
      case "AssignmentPattern":
        return find_lhs_ids(n.left);
      case "RestElement":
        return find_lhs_pat_ids([n.argument]);
      case "Property": {
        //ignore key
        switch (n.value.type) {
          case "AssignmentPattern":
            return find_lhs_ids(n.value.left);
          case "TSEmptyBodyFunctionExpression":
            return [];
          default:
            return find_lhs_ids(n.value);
        }
      }
    }
  });
};

const find_lhs_ids = (n: Deno.lint.Expression): Deno.lint.Identifier[] => {
  switch (n.type) {
    case "Identifier":
      return [n];
    case "ArrayPattern":
      return find_lhs_pat_ids(n.elements);
    case "ObjectPattern":
      return find_lhs_pat_ids(n.properties);
  }
  return [];
};

const is_snake_cased = (ident_name: string) => {
  return !/[A-Z]/.test(ident_name);
};

const is_screaming_snake_cased = (ident_name: string) => {
  return !/[a-z]$/.test(ident_name);
};

const is_underscored = (ident_name: string) => {
  const trimmed_ident = ident_name.replaceAll(/^_+|_+$/g, "");
  return /_/.test(trimmed_ident) &&
    trimmed_ident != trimmed_ident.toUpperCase();
};

const is_upper_camel_cased = (ident_name: string) => {
  if (is_underscored(ident_name)) {
    return false;
  }
  return /^[A-Z]/.test(ident_name);
};

const to_snake_case = (ident_name: string) => {
  const result = ident_name.replaceAll(
    /([a-z])([A-Z])/g,
    (_match, caps1, caps2) => {
      return `${caps1}_${caps2.toLowerCase()}`;
    },
  );

  if (result !== ident_name) {
    return result.toLowerCase();
  }

  return ident_name.toLowerCase();
};

const to_camel_case = (ident_name: string) => {
  if (!is_underscored(ident_name)) {
    return ident_name;
  }

  const result = ident_name.replaceAll(
    /([^_])_([a-z])/g,
    (_match, caps1, caps2) => {
      return `${caps1}${caps2.toUpperCase()}`;
    },
  );

  if (result != ident_name) {
    return result;
  }

  return ident_name.toUpperCase();
};

const to_upper_camel_case = (ident_name: string) => {
  const camel_cased = to_camel_case(ident_name);

  const result = camel_cased.replace(/^_*[a-z]/, (match) => {
    return match.toUpperCase();
  });

  if (result !== ident_name) {
    return result;
  }

  return ident_name;
};

export type IdentToCheck =
  | "variable"
  | "variable_or_constant"
  | "object_key"
  | "function"
  | "component"
  | "class"
  | "type_alias"
  | "interface"
  | "enum_name";

export const to_message = (
  name: string,
) => {
  return `Identifier '${name}' is not in rust style.`;
};

export const to_hint = (
  name: string,
  ident_type: IdentToCheck,
) => {
  switch (ident_type) {
    case "variable":
      return `Consider renaming \`${name}\` to \`${to_snake_case(name)}\``;
    case "function":
      return `Consider renaming \`${name}\` to \`${
        to_snake_case(name)
      }\` or adding an explicit return type of \`JSX.Element\`, if it is a component`;
    case "variable_or_constant": {
      const snake_cased = to_snake_case(name);
      return `Consider renaming \`${name}\` to \`${snake_cased}\` or \`${snake_cased.toUpperCase()}\``;
    }
    case "component":
      return `Consider renaming \`${name}\` to \`${
        to_upper_camel_case(name)
      }\``;
  }
};

const check_ident_snake_cased = (
  id: Deno.lint.Identifier | Deno.lint.PrivateIdentifier,
  context: Deno.lint.RuleContext,
  ident_type: IdentToCheck,
) => {
  const node = id;
  if (is_snake_cased(node.name)) return;
  context.report({
    node,
    message: to_message(node.name),
    hint: to_hint(node.name, ident_type) ?? "",
    fix(fixer) {
      // const original = context.sourceCode.getText(node);
      // const newText = `{ ${original} }`;
      return fixer.replaceText(
        node,
        id.type === "PrivateIdentifier"
          ? "#" + to_snake_case(node.name)
          : to_snake_case(node.name),
      );
    },
  });
};

const check_ident_snake_cased_or_screaming_snake_cased = (
  id: Deno.lint.Identifier,
  context: Deno.lint.RuleContext,
  ident_type: IdentToCheck,
) => {
  const node = id;
  if (is_snake_cased(node.name)) return;
  if (is_screaming_snake_cased(node.name)) return;
  context.report({
    node,
    message: to_message(node.name),
    hint: to_hint(node.name, ident_type) ?? "",
  });
};

const check_ident_upper_camel_cased = (
  id: Deno.lint.Identifier,
  context: Deno.lint.RuleContext,
  ident_type: IdentToCheck,
) => {
  const node = id;
  if (is_upper_camel_cased(node.name)) return;
  context.report({
    node,
    message: to_message(node.name),
    hint: to_hint(node.name, ident_type) ?? "",
    fix(fixer) {
      return fixer.replaceText(node, to_upper_camel_case(node.name));
    },
  });
};

const has_jsx_element_return_type = (type: Deno.lint.TSTypeAnnotation) => {
  if (type.typeAnnotation.type !== "TSTypeReference") return false;
  if (type.typeAnnotation.typeName.type !== "TSQualifiedName") return false;
  if (type.typeAnnotation.typeName.left.type !== "Identifier") return false;
  if (type.typeAnnotation.typeName.left.name !== "JSX") return false;
  if (type.typeAnnotation.typeName.right.type !== "Identifier") return false;
  if (type.typeAnnotation.typeName.right.name !== "Element") return false;
  //todo: visit type unions
  return true;
};

export default {
  name: "lint-plugin-rust-style",
  rules: {
    "rust-style": {
      create(context) {
        return {
          // assignment expression can be arbitrary, the declaration is what matters
          // AssignmentExpression(node) {
          //   const ids = find_lhs_ids(node.left);
          //   for (const id of ids) {
          //     check_ident_snake_cased(id, context, "variable");
          //   }
          // },
          "ClassBody PropertyDefinition"(node) { //todo: >; PrivateIdentifier
            if (node.key.type !== "Identifier") return;
            if (node.static) {
              check_ident_snake_cased_or_screaming_snake_cased(
                node.key,
                context,
                "variable_or_constant",
              );
            } else {
              check_ident_snake_cased(node.key, context, "variable");
            }
          },
          "ClassBody MethodDefinition"(node) { //todo: >
            if (
              node.key.type !== "Identifier" &&
              node.key.type !== "PrivateIdentifier"
            ) return;
            check_ident_snake_cased(node.key, context, "function");
          },
          FunctionDeclaration(node) {
            if (node.id === null) return;
            if (
              typeof node.returnType !== "undefined" &&
              /\.tsx$/.test(context.filename) &&
              has_jsx_element_return_type(node.returnType)
            ) {
              check_ident_upper_camel_cased(node.id, context, "component");
            } else {
              check_ident_snake_cased(node.id, context, "function");
            }
          },
        };
      },
    },
  },
} satisfies Deno.lint.Plugin;
