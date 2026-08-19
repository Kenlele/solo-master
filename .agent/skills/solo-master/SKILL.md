---
name: solo-master
description: >-
  Open, read, and live-translate any PDF academic research paper in the Solo-Master
  split-view web reader. Use when the user types "/solo-master <pdf_path>",
  asks to open/view a PDF paper, or wants to translate a paper in the web reader.
---

# Solo-Master Paper Reader Skill

Use this skill whenever the user wants to open and read a PDF paper with the **Solo-Master** split-view reader (`http://localhost:3000`), presenting the original PDF on the left and live Traditional Chinese translation on the right, with Apple Notes-style freehand annotations.

## Trigger Scenarios

- User types `/solo-master <pdf_path>`
- User asks: "幫我用 solo-master 打開這篇論文 <file.pdf>"
- User asks: "在閱讀器開啟論文 <file.pdf>"

## Execution Steps

1. **Verify if the Web App is Running**:
   Check if `http://localhost:3000` is accessible. If not running, inform the user or launch `npm run dev` in the workspace directory `/Users/yonglinlai/Desktop/solo_master`.

2. **Send the PDF to the Web Reader**:
   Run the CLI connector script with the user-provided PDF path:
   ```bash
   node /Users/yonglinlai/Desktop/solo_master/bin/solo-master.mjs "<pdf_path>"
   ```

3. **Verify Open Status**:
   - The connector will push the document to `http://localhost:3000/api/agent/open-pdf` and automatically launch the browser.
   - Reply to the user with a confirmation link to [http://localhost:3000](http://localhost:3000) and a brief overview of the loaded paper.
