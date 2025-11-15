### n8n Workflow Specification for Dataset Agent Assistance

This workflow assists Agent 2 in refining the datasets table by processing new feedback entries. It triggers on a webhook from the app (e.g., when feedback is saved or "Refine Dataset" is clicked), fetches relevant feedback from Supabase, uses AI to generate/refine dataset examples, performs quality checks, and updates the datasets table. It includes error handling, logging, and notifications for flawless operation. Paste this description into n8n's AI Workflow Builder to generate the workflow—adjust nodes as needed for your account.

#### Workflow Name
Dataset Refinement Assistant for MBR Agent 2

#### Workflow Description
Automate dataset building for AI fine-tuning in My Black :[ROOTS] app. Triggered by webhook from app sending feedback ID or query. Fetch feedback from Supabase, use AI (Ollama or Gemini) to generate/refine 3-5 new dataset entries based on genealogy context and feedback comments (e.g., correct inaccuracies on enslaved ancestors). Anonymize data, check quality (e.g., length, relevance), insert/update datasets table. Log actions and notify via email on errors or completion.

#### Trigger
- **Webhook Node**: Listen for POST requests from app.
  - URL: Generate in n8n (e.g., https://your-n8n.webhook/endpoint).
  - Method: POST.
  - Body Parameters: 
    - feedback_id (UUID): ID of new feedback entry.
    - query (string): Original user query (optional for context).
    - response (string): AI response (optional).
    - comments (string): User feedback comments.
  - Authentication: Basic Auth or API Key (match app's config).
  - Response: Return {status: "received"} on success.

#### Main Steps (Nodes in Sequence)
1. **Supabase Node (Fetch Feedback)**:
   - Operation: Query.
   - Query: SELECT * FROM feedback WHERE id = {{ $json.body.feedback_id }} (or similar if batch).
   - Table: feedback.
   - Fields: query, response, rating, comments, timestamp.
   - Connection: Use your Supabase credentials (URL, key).

2. **Supabase Node (Fetch Related Genealogy Data)**:
   - Operation: Query.
   - Query: SELECT * FROM persons JOIN marriages ON ... (customize to pull relevant data based on feedback query, e.g., enslaved or haplogroup views).
   - Use feedback query keywords to filter (e.g., if "enslaved", query paternal_enslaved_trace view).
   - Anonymize: Replace names with placeholders (e.g., use JavaScript node next).

3. **JavaScript Node (Quality/Anonymization Check)**:
   - Code: 
     ```
     const data = items[0].json;
     // Anonymize
     data.query = data.query.replace(/proper names/g, '[NAME]');
     // Check length/relevance
     if (data.query.length < 10 || data.comments.includes('irrelevant')) {
       throw new Error('Invalid data - skipping');
     }
     return { processedData: data };
     ```
   - Handle errors: Branch to error notification.

4. **AI Node (Generate/Refine Examples)**:
   - Use Ollama or Gemini node (based on your preference; connect to app's AI provider if possible).
   - Prompt: "Using this feedback (query: {{processedData.query}}, response: {{processedData.response}}, comments: {{processedData.comments}}), generate 3-5 refined dataset entries for fine-tuning gpt-oss models. Focus on Black history contexts like enslaved ancestors. Output as JSON array: [{query, response, example_type, source}]."
   - Model: gpt-oss:120b or similar.
   - Output: Parse JSON array of new entries.

5. **Loop Node (Batch Insert to Datasets Table)**:
   - Loop over AI-generated entries.
   - Inside Loop: Supabase Node - Operation: Insert.
     - Table: datasets.
     - Fields: query, response, example_type (e.g., "feedback-refined"), source (e.g., "feedback_id: {{feedback_id}}"), data (JSON details), timestamp (current).

6. **If Node (Quality Post-Check)**:
   - Condition: If generated entries < 3 or contain errors (e.g., empty fields).
   - True: Retry AI node or log error.
   - False: Proceed to notification.

#### Error Handling and Notification
- **On Error Branch (from any node)**: 
  - Email Node: Send to user (e.g., "Workflow failed: {{error.message}}. Check feedback ID {{feedback_id}}").
  - Log Node: Save to Supabase logs table if exists, or Slack/Discord integration.

#### Final Steps
- **HTTP Request Node (Webhook Back to App)**: POST update to app's webhook endpoint (e.g., confirm refinement: {status: "success", new_entries_count: X}).
- **Set Node (Logging)**: Record workflow run (e.g., timestamp, input/output) to a logs table in Supabase for auditing.

#### Additional Config
- **Scheduling**: Optional cron trigger for daily batch refinement (e.g., process all new feedback).
- **Scaling**: Set concurrency limits in n8n for large datasets; use pagination in Supabase queries.
- **App Integration**: In app Settings, add webhook URL field for n8n endpoint. App sends POST on events (e.g., feedback save).

This workflow ensures flawless operation—robust, automated, and integrated. Use n8n AI Builder with this description to create it, then test with sample data.
