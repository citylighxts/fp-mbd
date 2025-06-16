import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigAsPlugin } from "@eslint/compat";


export default [
  {files: ["**/*.{js,mjs,cjs,ts,tsx}"]},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  fixupConfigAsPlugin(pluginReactConfig),
  {
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      // Aturan ESLint tambahan untuk React dan TypeScript
      // Contoh:
      "react/react-in-jsx-scope": "off", // Tidak perlu impor React secara eksplisit di Next.js 17+
      "@typescript-eslint/no-explicit-any": "warn", // Mengizinkan 'any' tapi beri peringatan
      "@typescript-eslint/explicit-module-boundary-types": "off" // Nonaktifkan jika tidak ingin tipe eksplisit untuk ekspor
      // Tambahkan aturan kustom Anda di sini
    }
  }
];
