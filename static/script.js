const questionInput = document.getElementById("question");
const askButton = document.getElementById("askButton");

const topKInput = document.getElementById("topK");

const loading = document.getElementById("loading");

const answerSection = document.getElementById("answerSection");
const answerElement = document.getElementById("answer");

const sourcesSection = document.getElementById("sourcesSection");
const sourcesElement = document.getElementById("sources");

const errorElement = document.getElementById("error");

const statusElement = document.getElementById("status");


// Check API status
async function checkHealth() {

    try {

        const response = await fetch("/health");

        if (!response.ok) {
            throw new Error("API is not available");
        }

        const data = await response.json();

        statusElement.textContent =
            `🟢 System Ready — ${data.indexed_chunks} document chunks indexed`;

    } catch (error) {

        statusElement.textContent =
            "🔴 Unable to connect to RAG API";

    }
}


// Ask question
async function askQuestion() {

    const question = questionInput.value.trim();

    if (!question) {

        showError("Please enter a question.");

        return;
    }


    hideError();

    answerSection.classList.add("hidden");
    sourcesSection.classList.add("hidden");

    loading.classList.remove("hidden");

    askButton.disabled = true;
    askButton.textContent = "Searching...";


    try {

        const response = await fetch("/rag/query", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                question: question,

                top_k: Number(topKInput.value)

            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail || "Something went wrong."
            );

        }


        // Show answer
        answerElement.textContent =
            data.answer || "No answer generated.";

        answerSection.classList.remove("hidden");


        // Show sources
        displaySources(data.sources || []);

    } catch (error) {

        showError(error.message);

    } finally {

        loading.classList.add("hidden");

        askButton.disabled = false;

        askButton.textContent = "🔍 Ask Question";

    }

}


// Display sources
function displaySources(sources) {

    sourcesElement.innerHTML = "";


    if (sources.length === 0) {

        sourcesElement.innerHTML =
            "<p>No sources were returned.</p>";

        sourcesSection.classList.remove("hidden");

        return;
    }


    sources.forEach((source, index) => {

        const sourceDiv = document.createElement("div");

        sourceDiv.className = "source";


        sourceDiv.innerHTML = `

            <div class="source-title">
                📄 Source ${index + 1}: ${escapeHtml(source.source)}
            </div>

            <div class="source-meta">
                Page: ${source.page ?? "N/A"}
                &nbsp; | &nbsp;
                Chunk: ${source.chunk ?? "N/A"}
                &nbsp; | &nbsp;
                Distance: ${source.distance ?? "N/A"}
            </div>

            <div class="source-text">
                ${escapeHtml(source.text || "")}
            </div>

        `;


        sourcesElement.appendChild(sourceDiv);

    });


    sourcesSection.classList.remove("hidden");
}


// Escape HTML
function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


// Show error
function showError(message) {

    errorElement.textContent = "❌ " + message;

    errorElement.classList.remove("hidden");

}


// Hide error
function hideError() {

    errorElement.classList.add("hidden");

}


// Button
askButton.addEventListener(
    "click",
    askQuestion
);


// Enter question with Ctrl + Enter
questionInput.addEventListener(
    "keydown",
    function(event) {

        if (event.ctrlKey && event.key === "Enter") {

            askQuestion();

        }

    }
);


// Check health when page loads
checkHealth();