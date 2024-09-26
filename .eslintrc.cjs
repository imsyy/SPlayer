module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-essential",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    parser: "@typescript-eslint/parser",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "vue"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "vue/multi-word-component-names": "off",
  },
  global: {
    h: "readonly",
    ref: "readonly",
    computed: "readonly",
    watch: "readonly",
    watchEffect: "readonly",
    onBeforeMount: "readonly",
    onBeforeUnmount: "readonly",
    onBeforeUpdate: "readonly",
    reactive: "readonly",
    onMounted: "readonly",
    onUnmounted: "readonly",
    onActivated: "readonly",
    onDeactivated: "readonly",
    onRenderTracked: "readonly",
    onRenderTriggered: "readonly",
    onServerPrefetch: "readonly",
  },
};
