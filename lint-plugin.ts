export default {
  name: "lint-plugin-rust-style",
  rules: {
    "rust-style": {
      create(_context) {
        return {};
      },
    },
  },
} satisfies Deno.lint.Plugin;
