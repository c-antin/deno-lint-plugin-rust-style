//todo: cleanup
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

//todo: test helper functions
const is_snake_cased = (ident_name: string) => {
  return !/[A-Z]/.test(ident_name);
};

const is_screaming_snake_cased = (ident_name: string) => {
  return !/[a-z]/.test(ident_name);
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

const string_repr = (prop: Deno.lint.Expression) => {
  switch (prop.type) {
    case "Identifier":
      return prop.name;
    default:
      console.info("rust-style: string_repr: ignored prop", prop);
      return null;
  }
};

interface ObjectPat {
  key_name: string;
  value_name: string | null;
  has_default: boolean;
  in_var_declarator: boolean;
}

export type IdentToCheck =
  | "variable"
  | "variable_or_constant"
  | "function"
  | "component"
  | "class"
  | "object_key"
  | "object_key_shorthand"
  | "type_alias"
  | ObjectPat;

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
      return `Consider renaming \`${name}\` to \`${to_snake_case(name)}\`.`;
    case "function":
      return `Consider renaming \`${name}\` to \`${
        to_snake_case(name)
      }\` or adding an explicit return type of \`JSX.Element\`, if it is a component.`;
    case "variable_or_constant": {
      const snake_cased = to_snake_case(name);
      return `Consider renaming \`${name}\` to \`${snake_cased}\` or \`${snake_cased.toUpperCase()}\`.`;
    }
    case "component":
    case "class":
    case "type_alias":
      return `Consider renaming \`${name}\` to \`${
        to_upper_camel_case(name)
      }\`.`;
    case "object_key":
      return `Consider renaming \`${name}\` to \`${
        to_snake_case(name)
      }\`, or wrapping it in quotation mark like \`"${name}"\``;
    case "object_key_shorthand":
      return `Consider writing \`${
        to_snake_case(name)
      }: ${name}\` or \`"${name}": ${name}\``;
    default:
      if (typeof ident_type === "object") {
        const { key_name, value_name, has_default, in_var_declarator } =
          ident_type;
        let rename_name;
        if (value_name !== null) {
          rename_name = value_name;
        } else if (in_var_declarator) {
          rename_name = null;
        } else {
          rename_name = key_name;
        }
        if (rename_name !== null) {
          return `Consider renaming \`${rename_name}\` to \`${
            to_snake_case(rename_name)
          }\`.`;
        }

        if (has_default) {
          return `Consider replacing \`{{ ${key_name} = .. }}\` with \`{{ ${key_name}: ${
            to_snake_case(key_name)
          } = .. }}\`.`;
        }

        return `Consider replacing \`{{ ${key_name} }}\` with \`{{ ${key_name}: ${
          to_snake_case(key_name)
        } }}\`.`;
      }
      console.info("rust-style: ignored hint", ident_type);
      return null;
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
    fix: typeof ident_type === "object" ? undefined : (fixer) => {
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

const check_pat = (
  pat:
    | Deno.lint.ArrayPattern
    | Deno.lint.Identifier
    | Deno.lint.MemberExpression
    | Deno.lint.ObjectPattern
    | Deno.lint.AssignmentPattern
    | Deno.lint.RestElement
    | Deno.lint.TSParameterProperty
    | null,
  context: Deno.lint.RuleContext,
  kind?: Deno.lint.VariableDeclaration["kind"],
) => {
  if (pat === null) return;
  switch (pat.type) {
    case "Identifier": {
      if (kind === "const") {
        check_ident_snake_cased_or_screaming_snake_cased(
          pat,
          context,
          "variable_or_constant",
        );
      } else {
        check_ident_snake_cased(pat, context, "variable");
      }
      break;
    }
    case "ArrayPattern":
      for (const el of pat.elements) {
        check_pat(el, context, kind);
      }
      break;
    case "RestElement":
      check_pat(pat.argument, context, kind);
      break;
    case "ObjectPattern":
      for (const prop of pat.properties) {
        switch (prop.type) {
          //todo: handle object pat assignment
          case "Property": {
            const key = prop.key;
            const value = prop.value;
            if (value === null) { //todo: apparently this is possible
              if (key.type === "Identifier" && typeof kind === "undefined") { //todo: apparently this is possible, too
                check_ident_snake_cased(key, context, {
                  key_name: string_repr(key) ?? "[KEY]",
                  value_name: null,
                  has_default: false,
                  in_var_declarator: false,
                });
              }
            } else {
              switch (value.type) {
                case "Identifier":
                  check_ident_snake_cased(value, context, {
                    key_name: string_repr(key) ?? "[KEY]",
                    value_name: value.name,
                    has_default: false,
                    in_var_declarator: typeof kind !== "undefined",
                  });
                  break;
                case "AssignmentPattern":
                  if (value.left.type === "Identifier") {
                    check_ident_snake_cased(value.left, context, {
                      key_name: string_repr(key) ?? "[KEY]",
                      value_name: value.left.name,
                      has_default: true,
                      in_var_declarator: typeof kind !== "undefined",
                    });
                    break;
                  }
                  /* falls through */
                case "ArrayPattern":
                case "ObjectPattern": {
                  check_pat(value, context, kind);
                  break;
                }
                case "Literal":
                  //ignore
                  break;
                default:
                  //ignore
                  console.info("rust-style: ignored pat value", pat, value);
                  break;
              }
            }
            break;
          }
          case "RestElement": {
            check_pat(prop.argument, context, kind);
            break;
          }
        }
      }
      break;
    case "AssignmentPattern":
      check_pat(pat.left, context, kind);
      break;
    default:
      //ignore
      console.info("rust-style: ignored pat", pat);
      break;
  }
};

const check_ts_type_element = (
  node:
    | Deno.lint.TSCallSignatureDeclaration
    | Deno.lint.TSPropertySignature
    | Deno.lint.TSConstructSignatureDeclaration
    | Deno.lint.TSMethodSignature
    | Deno.lint.TSIndexSignature,
  context: Deno.lint.RuleContext,
) => {
  switch (node.type) {
    case "TSPropertySignature": {
      const sig = node;
      if (sig.key.type === "Identifier") {
        check_ident_snake_cased(
          sig.key,
          context,
          "object_key",
        );
      }
      if (typeof sig.typeAnnotation !== "undefined") {
        check_ts_type(sig.typeAnnotation.typeAnnotation, context);
      }
      break;
    }
    case "TSMethodSignature": {
      const sig = node;
      if (sig.key.type === "Identifier") {
        check_ident_snake_cased(sig.key, context, "function");
      }
      //todo: params?
      break;
    }
    //todo: getter setter?
    case "TSIndexSignature":
    case "TSCallSignatureDeclaration":
    case "TSConstructSignatureDeclaration":
      //ignore
      break;
  }
};

const check_ts_type = (
  node: Deno.lint.TypeNode,
  context: Deno.lint.RuleContext,
) => {
  if (node.type === "TSTypeLiteral") {
    for (const member of node.members) {
      check_ts_type_element(member, context);
    }
  }
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
            for (const param of node.params) {
              check_pat(param, context);
            }
          },
          FunctionExpression(node) {
            for (const param of node.params) {
              check_pat(param, context);
            }
          },
          ArrowFunctionExpression(node) {
            for (const param of node.params) {
              check_pat(param, context);
            }
          },
          ClassDeclaration(node) {
            if (node.id === null) return;
            check_ident_upper_camel_cased(node.id, context, "class");
          },
          VariableDeclaration(node) {
            for (const decl of node.declarations) {
              let checked_ident = false;

              if (decl.init !== null) {
                switch (decl.init.type) {
                  case "ObjectExpression":
                    for (const prop of decl.init.properties) {
                      switch (prop.type) {
                        case "Property":
                          if (prop.key.type === "Identifier") {
                            if (prop.shorthand) {
                              check_ident_snake_cased(
                                prop.key,
                                context,
                                "object_key_shorthand",
                              );
                            } else {
                              check_ident_snake_cased(
                                prop.key,
                                context,
                                "object_key",
                              );
                            }
                          }
                          break;
                        default:
                          //ignore
                          break;
                      }
                    }
                    break;
                  case "FunctionExpression":
                  case "ArrowFunctionExpression":
                    if (
                      decl.init.id !== null &&
                      typeof decl.init.id !== "undefined"
                    ) {
                      check_ident_snake_cased(
                        decl.init.id,
                        context,
                        "function",
                      );
                    }
                    if (decl.id.type === "Identifier") {
                      const node = decl.init;
                      if (
                        typeof node.returnType !== "undefined" &&
                        /\.tsx$/.test(context.filename) &&
                        has_jsx_element_return_type(node.returnType)
                      ) {
                        check_ident_upper_camel_cased(
                          decl.id,
                          context,
                          "component",
                        );
                      } else {
                        check_ident_snake_cased(decl.id, context, "function");
                      }
                      checked_ident = true;
                    }
                    break;
                  case "ClassExpression":
                    if (
                      decl.init.id !== null &&
                      typeof decl.init.id !== "undefined"
                    ) {
                      check_ident_upper_camel_cased(
                        decl.init.id,
                        context,
                        "class",
                      );
                    }
                    if (decl.id.type === "Identifier") {
                      check_ident_upper_camel_cased(decl.id, context, "class");
                      checked_ident = true;
                    }
                    break;
                  default:
                    //ignore
                    break;
                }
              }

              if (!checked_ident) {
                check_pat(decl.id, context, node.kind);
              }
            }
          },
          //todo: import export
          TSTypeAliasDeclaration(node) {
            check_ident_upper_camel_cased(node.id, context, "type_alias");
            check_ts_type(node.typeAnnotation, context);
          },
        };
      },
    },
  },
} satisfies Deno.lint.Plugin;
