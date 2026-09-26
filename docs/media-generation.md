# Connecting Image And Video Generation

## Connector

This workspace configures fal.ai's official Run MCP server in [.vscode/mcp.json](../.vscode/mcp.json). It is a hosted Streamable HTTP service at `https://mcp.fal.ai/mcp`, not a documentation-only connector. No extra npm package, website backend, local media model, or client-side API key is required.

The connection exposes model discovery, schemas, pricing, image/video execution, job status and result retrieval. Configuring a connector is not proof that its authentication or generation succeeded. Until a valid key is supplied and the server starts, the integration is configured but not connected.

## What The User Must Supply

1. A [fal.ai account](https://fal.ai/) and an [API key](https://fal.ai/dashboard/keys) with model-run access. Paid runs require sufficient credits/billing. Copilot and ChatGPT subscriptions do not supply fal API credits. Do not purchase credits or enable billing without the account owner's action.
2. Enter the key only into the password-style VS Code input when starting `falMedia`. The tracked configuration holds a placeholder, never the key. Do not paste keys in chat, source files, command arguments or screenshots.
3. The original five photo files as PNG/JPEG/WebP in a local folder. Their identity mapping is already confirmed: Abdul, Jonart, Yassin, Mujtaba, Saif. Chat attachments are not assumed to be readable file paths for the hosted provider. Prefer ignored `.local/reference-photos/` with a clear member ID per filename.
4. Explicit permission to upload those reference photos to fal and the chosen model provider, plus an approved total spend ceiling. Upload/model inputs leave this machine; CDN URLs are not a private local folder or access-control guarantee. Do not upload any reference or make a paid call merely to test the connection.

## Start In VS Code

1. Open the Command Palette and run **MCP: List Servers**.
2. Select **falMedia**, then **Start Server**. Accept the trust prompt only after reviewing the official endpoint and configuration.
3. Enter the fal API key into the secure password prompt. VS Code stores the input for reuse without writing its value into this JSON file.
4. Confirm the server is running and its tools are enabled in Chat's tool picker. If this existing chat does not discover newly added tools, reopen the chat or reload the window after saving work.

Input-variable configuration is supported by the VS Code extension-host chat. Current VS Code documentation says servers using interactive `${input:...}` variables are not forwarded to Agent Host sessions. If using Agent Host, configure authentication through its supported private environment-file mechanism after checking that host's documentation; do not replace the placeholder with a literal key.

## Generate Deliberately

- Start with discovery, input-schema and pricing tools. Check the selected model's likeness, image-reference, licence and video restrictions before submitting work. No provider guarantees an exact Mii match or consistent identity on the first attempt.
- Approve one portrait first, then use it as the visual reference for the other four. The private photo-specific prompt brief is `.local/portrait-generation-brief.md`.
- Native MCP `upload_file` documentation currently specifies a remote URL, despite a broader overview mentioning local paths. A hosted server cannot directly read a path on this Mac. Inspect the discovered schema; if local upload is unsupported, use fal's official upload API/SDK with the key kept outside chat, or an explicitly approved reference URL. Do not expose the workspace or create a public tunnel.
- Use actual generated stills for any image-to-video step and check that the chosen model permits the intended depiction. Video is optional and needs its own price check. OpenAI's currently documented Sora API blocks real-person/human-face inputs by default, so it is not assumed to support this workflow.
- Save stills only as `.local/review/portraits/<member-id>-ai.webp` and optional silent clips as `<member-id>-ai.mp4`. The site already supports them in local review. Do not relabel the rejected procedural renders as generated images.
- Outputs still need each member's approval before entering public content. Do not enable tool auto-approval, bypass provider moderation, publish, or push as part of generation.

## Verified Sources

Checked on 2026-09-15:

- [fal Run MCP, endpoint, authentication and tool reference](https://fal.ai/docs/model-apis/mcp)
- [fal API keys](https://fal.ai/dashboard/keys)
- [fal pricing](https://fal.ai/pricing)
- [VS Code MCP configuration and secure input variables](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [VS Code MCP trust and server management](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [OpenAI video-generation restrictions](https://developers.openai.com/api/docs/guides/video-generation)