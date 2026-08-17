# CI recommendations

The provided GitHub PAT does not include the `workflow` scope, so Actions YAML cannot be pushed via API.

Suggested local / external CI steps:

```bash
npm install
npm run test -w @cintexa/financial-engine --if-present
npm run test -w @cintexa/document-processor --if-present
npm run test -w @cintexa/ai-agents --if-present
```

To enable GitHub Actions, add a token with `workflow` scope and create `.github/workflows/ci.yml` with Node 20 install + the test scripts above.
