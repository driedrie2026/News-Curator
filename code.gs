function sendUSAndTrumpNews() {
  // === CONFIGURATION ===
  const GEMINI_API_KEYS = [
    'place your api key here', 
    'place your api key here'
  ];
  const CHAT_WEBHOOK_URL = 'PLACE YOUR WEBHOOK HERE'; 
  
  // 1. Fetch live news DIRECTLY from verified publisher RSS feeds (No Google News)
  const directFeeds = [
    'https://feeds.npr.org/1014/rss.xml', 
    'https://www.pbs.org/newshour/feeds/rss/politics', 
    'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml' 
  ];
  
  let rawNewsItems = [];
  const now = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Loop through each direct publisher feed
  directFeeds.forEach(feedUrl => {
    try {
      const xmlResponse = UrlFetchApp.fetch(feedUrl, { muteHttpExceptions: true });
      if (xmlResponse.getResponseCode() === 200) {
        const document = XmlService.parse(xmlResponse.getContentText());
        const root = document.getRootElement();
        const channel = root.getChild('channel');
        const items = channel ? channel.getChildren('item') : root.getChildren('entry', root.getNamespace());
        
        for (let i = 0; i < items.length; i++) {
          let title = items[i].getChild('title') ? items[i].getChild('title').getText() : '';
          let link = items[i].getChild('link') ? items[i].getChild('link').getText() : '';
          let pubDate = items[i].getChild('pubDate') ? items[i].getChild('pubDate').getText() : '';
          let description = items[i].getChild('description') ? items[i].getChild('description').getText() : '';
          
          let articleTime = new Date(pubDate).getTime();
          if (now - articleTime <= oneDay) {
            if (title.toLowerCase().includes('trump') || description.toLowerCase().includes('trump')) {
               rawNewsItems.push(`Title: ${title}\nPublished: ${pubDate}\nLink: ${link}`);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch or parse direct feed: " + feedUrl);
    }
  });

  if (rawNewsItems.length === 0) {
    console.warn("No news found matching the criteria in the direct feeds for the last 24 hours. Halting script.");
    return;
  }

  const rawNewsText = rawNewsItems.slice(0, 20).join('\n\n');

  // 2. Define the exact strict prompt for Gemini (BOLD and GAMIFIED)
  const prompt = `
  Role: You are an expert political news editor. Your objective is to curate, filter, and summarize the absolute latest news updates regarding Donald Trump.
  
  Temporal Constraint:
  24-Hour Rule: Exclusively curate stories published within the last 24 hours.
  
  Topic Prioritization:
  - Donald Trump (direct statements, legal proceedings, 2026 political influence, campaign infrastructure).
  - Key political figures responding to Trump.
  - International relations involving Trump.
  
  Exclusions: Discard all news unrelated to Donald Trump, entertainment, or sports.
  
  Output Formatting Rules:
  Do not provide introductory or concluding remarks. Present the most critical stories in a stack-ranked, numbered list. 
  GAMIFIED FORMAT: Make the headlines punchy and engaging. You MUST make the Title BOLD by wrapping it in asterisks (e.g., *Headline*), and include relevant emojis to make it feel gamified!
  
  Use EXACTLY this structure (1., 2., 3., etc.):
  
  1. 🚨 *[BOLD Gamified Headline with Emojis]*
  Summary: A 2-3 sentence neutral synthesis of the core event and political implications.
  Source: <Direct URL|Name of Publication>
  
  Raw News Articles:
  ${rawNewsText}
  `;

  // 3. Call the Gemini API with Auto-Retry and Dual-Key Fallback Logic
  const geminiPayload = {
    "contents": [{ "parts": [{ "text": prompt }] }]
  };

  const geminiOptions = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(geminiPayload),
    "muteHttpExceptions": true 
  };

  let responseCode = 0;
  let responseText = "";
  let apiSuccess = false;
  
  for (let k = 0; k < GEMINI_API_KEYS.length; k++) {
    const currentKey = GEMINI_API_KEYS[k];
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${currentKey}`;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      const geminiResponse = UrlFetchApp.fetch(geminiUrl, geminiOptions);
      responseCode = geminiResponse.getResponseCode();
      responseText = geminiResponse.getContentText();
      
      if (responseCode === 200) {
        apiSuccess = true;
        break; 
      } else if (responseCode === 503 || responseCode === 429) {
        Utilities.sleep(3000); 
      } else {
        break; 
      }
    }
    
    if (apiSuccess) break;
  }
  
  // 4. Extract Gemini's formatted response
  let finalMessage = "";
  let formattingSuccess = false;
  
  if (apiSuccess) {
    const geminiJson = JSON.parse(responseText);
    try {
      finalMessage = geminiJson.candidates[0].content.parts[0].text.trim();
      if (finalMessage.length > 50) { 
        formattingSuccess = true; 
      }
    } catch (e) {
      console.error("Error formatting Gemini output:", responseText); 
    }
  }

  // 5. Send to Webhook with BOLD Gamified Header
  if (formattingSuccess) {
    const today = new Date();
    // Formats date nicely (e.g., September 19, 2026)
    const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "MMMM d, yyyy");

    // The entire Diwata header is wrapped in *asterisks* to make it bold in Google Chat
    const chatPayload = {
      "text": `<users/all> 🤖 *Hi Team, this is Diwata your daily news Curator, please see the Top news as of ${formattedDate}* 🚀\n\n${finalMessage}`
    };

    const chatOptions = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(chatPayload)
    };

    UrlFetchApp.fetch(CHAT_WEBHOOK_URL, chatOptions);
  }
}
