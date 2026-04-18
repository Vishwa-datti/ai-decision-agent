const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// UI Elements
const queryInput = document.getElementById('query');
const contextInput = document.getElementById('context');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsPanel = document.getElementById('resultsPanel');
const optionsList = document.getElementById('optionsList');
const risksList = document.getElementById('risksList');
const finalRecommendation = document.getElementById('finalRecommendation');
const trustFactor = document.getElementById('trustFactor');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const apiKeyInput = document.getElementById('apiKey');
const saveSettings = document.getElementById('saveSettings');
const closeSettings = document.getElementById('closeSettings');

// Load API Key from local storage
let API_KEY = localStorage.getItem('decision_studio_api_key') || '';
apiKeyInput.value = API_KEY;

// Event Listeners
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
saveSettings.addEventListener('click', () => {
    API_KEY = apiKeyInput.value.trim();
    localStorage.setItem('decision_studio_api_key', API_KEY);
    settingsModal.classList.add('hidden');
    alert('API Key saved successfully!');
});

analyzeBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    const context = contextInput.value.trim();

    if (!query) {
        alert('Please enter a decision query.');
        return;
    }

    if (!API_KEY) {
        settingsModal.classList.remove('hidden');
        alert('Please configure your API key first.');
        return;
    }

    setLoading(true);
    try {
        const result = await runDecisionAgent(query, context);
        renderResults(result);
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        analyzeBtn.classList.add('loading');
        analyzeBtn.disabled = true;
    } else {
        analyzeBtn.classList.remove('loading');
        analyzeBtn.disabled = false;
    }
}

async function runDecisionAgent(query, context) {
    const systemPrompt = `You are an AI Decision-Making Agent designed to help users make informed choices.
    Analyze the following query: "${query}"
    Context: "${context || 'No additional context provided'}"

    Instructions:
    1. Identify possible options.
    2. Analyze pros and cons for each.
    3. Consider risks, trade-offs, and long-term impact.
    4. Provide a clear recommendation.
    5. Explain why the recommendation was made to build user trust.

    Rules:
    - Be structured and concise.
    - Do not give vague answers.
    - Do NOT ask follow-up questions.
    - Output MUST be in valid JSON format only, with the following keys:
      {
        "options": [
          { "title": "Option 1 name", "pros": "Brief pros", "cons": "Brief cons" }
        ],
        "risks": ["Key risk 1", "Key risk 2"],
        "recommendation": "Final decision with reasoning",
        "trustFactor": "Explanation of why this is trustworthy"
      }`;

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: systemPrompt }]
            }]
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to fetch from API');
    }

    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    
    // Clean JSON if LLM added markdown blocks
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
}

function renderResults(data) {
    // Render Options
    optionsList.innerHTML = data.options.map(opt => `
        <div class="option-item">
            <span class="item-title">${opt.title}</span>
            <div class="pros">Positives: ${opt.pros}</div>
            <div class="cons">Trade-offs: ${opt.cons}</div>
        </div>
    `).join('');

    // Render Risks
    risksList.innerHTML = data.risks.map(risk => `
        <div class="risk-item">
            <span class="item-title">• ${risk}</span>
        </div>
    `).join('');

    // Render Recommendation
    finalRecommendation.innerHTML = `<p>${data.recommendation}</p>`;
    trustFactor.innerHTML = `<strong>Trust Insight:</strong> ${data.trustFactor}`;

    // Show Panel
    resultsPanel.classList.remove('hidden');
    resultsPanel.scrollIntoView({ behavior: 'smooth' });
}
