n8n Workflow Description for Dataset Refinement Assistance

This workflow helps the Dataset Agent (Agent 2) in the My Black :[ROOTS] app by automating the refinement of the dataset stored in a Google Sheet. It starts when triggered by a webhook from the app, such as when new feedback is saved or a "Refine Dataset" action is initiated, and the webhook sends details like the feedback ID, query, response, and comments.

First, fetch the specific feedback entry from the Supabase database using the provided feedback ID, pulling fields like query, response, rating, comments, and timestamp. Then, fetch related chat history entries from the Supabase chat_history table, filtering for similar queries to provide historical context, limiting to the most recent 10 entries for efficiency.

Next, fetch relevant genealogy data from Supabase tables like persons and marriages, or views such as paternal_enslaved_trace, based on keywords from the feedback query and chat history to gather contextual information.

Perform anonymization and quality checks on the data, replacing proper names with placeholders and skipping invalid items if the query is too short or comments indicate irrelevance.

Use an AI model like Ollama or Gemini to generate or refine 3-5 new dataset entries, incorporating the feedback, chat history for insightful context, and genealogy data, focusing on Black history aspects like enslaved ancestors. Output the results as a structured array with fields for query, response, example_type, source, and additional data.

Loop through the generated entries and append each as a new row to the specified Google Sheet, mapping fields to columns like query, response, example_type, source, data (as JSON), and timestamp.

Conduct a post-generation quality check to ensure at least 3 valid entries were created, retrying the AI step if not.

For error handling, if any step fails, send an email notification with the error message and details like the feedback ID, and log the issue to a Supabase logs table if available.

Finally, send a confirmation webhook back to the app with the status and number of new entries added, and log the entire workflow run including timestamp and input/output summary to Supabase for auditing.

Schedule an optional daily run to process any unrefined new feedback in batches, and set limits for concurrency to handle scaling for larger datasets.
