interface ImportMetaEnv {
  readonly VITE_ENCORE_API_URL?: string;
  readonly VITE_ENCORE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
