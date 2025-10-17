# WiseChoice

A smart product collection and comparison assistant (Chrome Extension + local AI service). Collect products from Amazon with one click, select multiple candidates in the side panel, and get a decision-forward AI report to quickly pick "the one."

## Features
- One-click capture on Amazon product pages: title, price, bullets, specs, ASIN, image, etc.
- Candidate management with persistent storage and de-duplication by `id` (ASIN first, otherwise URL fingerprint).
- Side panel comparison: select at least two items and generate a report.
- AI decision report via local `FastAPI` service (default `http://localhost:8765`) with TL;DR, strategy, key differences, and reasons.
- Graceful fallback: if the AI service is unavailable, show a basic comparison (price range, brands, common bullets).

## Architecture
- Browser (Manifest V3)
  - `manifest.json`: permissions and entries; registers `content.js`, `background.js`, and `side_panel`.
  - `content.js`: runs on Amazon pages, extracts product data, and sends it to the background for storage.
  - `background.js`: receives and stores candidates; opens the side panel when the extension icon is clicked.
  - `sidebar.html`/`sidebar.js`/`sidebar.css`: UI for candidate list and AI reports.
  - `content.css`: styles for the floating button and notifications.
- Local AI Service
  - `api_server.py`: `FastAPI` app exposing `POST /api/compare`, builds prompts, and calls the agent.
  - `agent.py`: decision-making agent via `openai-agents` producing `title/tldr/strategy/analysis/reasons`.
  - `requirements.txt`: Python dependencies.
  - `start_ai_service.sh`: startup helper and environment checks.

CORS is enabled for development; the extension calls `http://localhost:8765` directly.

## Installation
### 1) Load the Chrome Extension
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select the `WiseChoice-Release` directory

### 2) Start the Local AI Service
Recommended Python 3.11/3.12 with a virtual environment:

```bash
cd /Users/charles/Downloads/WiseChoice-Release
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key"

# Start (choose one)
python api_server.py
# or
bash start_ai_service.sh
```

Service runs at `http://localhost:8765`, docs at `http://localhost:8765/docs`.

## Usage
1. Open any Amazon product detail page (`amazon.com/.co.uk/.de/.fr/.co.jp/.cn/.ca/.it/.es`).
2. Click the floating `+` button to capture the current product.
3. Click the extension icon to open the side panel and view candidates.
4. Select at least two products and click "Compare".
   - If the AI service is running: you’ll see a structured decision report.
   - If not: you’ll see a basic comparison and a tip to start the service.

## API (Local Service)
- `GET /`: service status and version
- `GET /api/health`: returns `{ "status": "healthy" }`
- `POST /api/compare` request:
  ```json
  {
    "products": [
      {
        "id": "amz:...",
        "source": "https://...",
        "title": "...",
        "brand": "...",
        "price": { "raw": "$999.00", "currency": "USD", "amount": 999.0 },
        "bullets": ["..."],
        "tech": {"Key": "Value"},
        "asin": "XXXXXXXXXX",
        "img": "https://..."
      }
    ]
  }
  ```
- Successful response:
  ```json
  {
    "title": "...",
    "tldr": "...",
    "strategy": "...",
    "analysis": "...",
    "reasons": "...",
    "success": true
  }
  ```

## Data & Storage
- Uses `chrome.storage.local` under key `wisechoice:candidates`.
- De-dup by `product.id` (`amz:ASIN` preferred, otherwise `url:<hash>`).
- Side panel supports select-all and per-item delete.

## Permissions & Security
- Chrome permissions: `storage`, `activeTab`, `scripting`, `sidePanel`.
- Host permissions: Amazon domains and `http://localhost:8765/*`.
- CORS: open for development; tighten for production.
- Secrets: set `OPENAI_API_KEY` locally. Do not commit secrets.

## Project Structure
```
WiseChoice-Release/
  ├── manifest.json
  ├── content.js
  ├── content.css
  ├── background.js
  ├── sidebar.html
  ├── sidebar.js
  ├── sidebar.css
  ├── api_server.py
  ├── agent.py
  ├── requirements.txt
  ├── start_ai_service.sh
  ├── icon.png/svg
  └── (venv/)
```

## Development Tips
- Extension:
  - Enable Developer mode in `chrome://extensions/` and reload after edits.
  - Use DevTools to inspect `content.js` and `sidebar.js` logs.
- Service:
  - Run `python api_server.py` and check logs; open `http://localhost:8765/docs`.
  - If port 8765 is occupied, change it in `api_server.py` or free the port.

## License
Released under the MIT License. See `LICENSE` for details.
