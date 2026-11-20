const decisionForm = document.getElementById("decisionForm");
const clearButton = document.getElementById("clearButton");
// Save and restore form information
const storageKey = "decisionWiseFormData";

// Restore previously saved information
const savedData = localStorage.getItem(storageKey);

if (savedData) {
    const formData = JSON.parse(savedData);

    Object.keys(formData).forEach((id) => {
        const field = document.getElementById(id);

        if (field) {
            field.value = formData[id];
        }
    });
}

// Automatically save information when users make changes
function saveFormData() {
    const formData = {};

    decisionForm.querySelectorAll("input, select, textarea").forEach((field) => {
        if (field.id) {
            formData[field.id] = field.value;
        }
    });

    localStorage.setItem(storageKey, JSON.stringify(formData));
}

decisionForm.addEventListener("input", saveFormData);
decisionForm.addEventListener("change", saveFormData);

// Clear saved information when clicked
clearButton.addEventListener("click", function () {
    const confirmClear = confirm(
        "Are you sure you want to clear all your information?"
    );

    if (confirmClear) {
        decisionForm.querySelectorAll("input, select, textarea").forEach((field) => {
            if (field.tagName === "SELECT") {
                field.selectedIndex = 0;
            } else {
                field.value = "";
            }
        });

        localStorage.removeItem(storageKey);

        const results = document.getElementById("results");

        if (results) {
            results.remove();
        }

        alert("Your information has been cleared successfully.");
    }
});
decisionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const getValue = (id) =>
        Number(document.getElementById(id).value);

    const data = {
        currency: document.getElementById("currency").value,
        income: getValue("income"),
        essential: getValue("essential"),
        nonEssential: getValue("nonEssential"),
        debt: getValue("debt"),
        savings: getValue("savings"),
        emergencyTarget: getValue("emergencyTarget"),
        item: document.getElementById("item").value.trim(),
        price: getValue("price"),
        additionalCosts: getValue("additionalCosts"),
        paymentMethod: document.getElementById("paymentMethod").value,
        installmentUpfront: getValue("installmentUpfront"),
        installmentMonths: getValue("installmentMonths"),
        interestRate: getValue("interestRate"),
        waitingPeriod: getValue("waitingPeriod"),
        monthlySavings: getValue("monthlySavings")
    };

    if (
        data.income <= 0 ||
        data.essential<= 0 ||
        data.price <= 0 ||
        data.installmentUpfront > (data.price + data.additionalCosts) ||
        data.emergencyTarget <= 0 ||
        data.installmentMonths <= 0 ||
        data.waitingPeriod <= 0
    ) {
        alert("Please enter valid values in the required fields.");
        return;
    }

    // Calculate the user's financial position
    const totalMonthlyExpenses =
        data.essential + data.nonEssential + data.debt;

    const disposableIncome =
        data.income - totalMonthlyExpenses;

    const totalPurchaseCost =
        data.price + data.additionalCosts;

    // Helper functions
    const formatMoney = (amount) =>
        `${data.currency} ${amount.toLocaleString("en", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    const getRiskLevel = (coverage) => {
        if (coverage < 1) return "High Risk";
        if (coverage < data.emergencyTarget) return "Moderate Risk";
        return "Lower Risk";
    };

    const escapeHTML = (value) =>
        String(value).replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);

    // Scenario 1: Buy Now
    const buyNowSavings =
        data.savings - totalPurchaseCost;

    const buyNowCoverage =
        Math.max(0, buyNowSavings / data.essential);

    const buyNowRisk = getRiskLevel(buyNowCoverage);

    // Scenario 2: Wait and Save
    const waitingSavings =
        data.savings +
        (data.monthlySavings * data.waitingPeriod);

    const waitingSavingsAfterPurchase =
        waitingSavings - totalPurchaseCost;

    const waitingCoverage =
        Math.max(0, waitingSavingsAfterPurchase / data.essential);

    const waitingRisk = getRiskLevel(waitingCoverage);

    // Scenario 3: Installment
    const installmentSavings =
        data.savings - data.installmentUpfront;

    const installmentCoverage =
        Math.max(0, installmentSavings / data.essential);

    const amountFinanced =
        Math.max(0, totalPurchaseCost - data.installmentUpfront);

    const monthlyRate =
        data.interestRate / 100 / 12;

    let monthlyInstallment = 0;

    if (amountFinanced > 0) {
        if (monthlyRate === 0) {
            monthlyInstallment =
                amountFinanced / data.installmentMonths;
        } else {
            monthlyInstallment =
                amountFinanced * monthlyRate /
                (1 - Math.pow(
                    1 + monthlyRate,
                    -data.installmentMonths
                ));
        }
    }

    const cashFlowAfterInstallment =
        disposableIncome - monthlyInstallment;

    const totalInstallmentPaid =
        data.installmentUpfront +
        (monthlyInstallment * data.installmentMonths);

    const totalInterest =
        Math.max(0, totalInstallmentPaid - totalPurchaseCost);

    let paymentStatus;

    if (cashFlowAfterInstallment < 0) {
        paymentStatus = "Negative Cash Flow";
    } else if (monthlyInstallment > disposableIncome * 0.5) {
        paymentStatus = "High Payment Burden";
    } else if (monthlyInstallment > disposableIncome * 0.3) {
        paymentStatus = "Moderate Payment Burden";
    } else {
        paymentStatus = "Healthy Cash Flow";
    }

    const installmentRisk =
        getRiskLevel(installmentCoverage);

    // Overall recommendation
let recommendation;
let recommendationReason;

if (disposableIncome <= 0) {
    recommendation = "Avoid Purchase";
    recommendationReason =
        "Your monthly expenses leave no disposable income to support this purchase.";

} else if (
    buyNowSavings >= 0 &&
    buyNowCoverage >= data.emergencyTarget
) {
    recommendation = "Buy Now";
    recommendationReason =
        "You can pay the full purchase cost while maintaining your emergency fund target.";

} else if (
    waitingSavingsAfterPurchase >= 0 &&
    waitingCoverage >= data.emergencyTarget
) {
    recommendation = `Wait ${data.waitingPeriod} Months`;
    recommendationReason =
        "Waiting and saving gives you a stronger financial position before purchasing.";

} else if (
    installmentSavings >= 0 &&
    installmentCoverage >= data.emergencyTarget &&
    cashFlowAfterInstallment >= 0 &&
    paymentStatus === "Healthy Cash Flow"
) {
    recommendation = "Installment";
    recommendationReason =
        "Your emergency savings remain protected and the monthly repayments are manageable.";

} else if (
    installmentSavings >= 0 &&
    installmentCoverage >= data.emergencyTarget &&
    cashFlowAfterInstallment >= 0 &&
    paymentStatus === "Moderate Payment Burden"
) {
    recommendation = "Installment with Caution";
    recommendationReason =
        "You can maintain your emergency fund, but the monthly repayment takes a significant share of your disposable income. Consider a longer repayment period or a larger upfront payment.";

} else {
    recommendation = "Avoid Purchase";
    recommendationReason =
        "None of the available options currently meets your financial safety conditions.";
}

    // Display the assessment
    let results = document.getElementById("results");

    if (!results) {
        results = document.createElement("section");
        results.id = "results";
        results.className = "results-section";
        decisionForm.insertAdjacentElement("afterend", results);
    }

    results.innerHTML = `

        <div class="assessment-results">

    <div class="results-header">
        <p class="results-eyebrow">DECISIONWISE ANALYSIS</p>
        <h2>Your Financial Assessment</h2>
        <p class="results-subtitle">
            Here's how your financial position looks for
            ${escapeHTML(data.item)}.
        </p>
    </div>

    <section class="overview-section">
        <h3>Financial Overview</h3>

        <div class="overview-grid">
            <div class="overview-card">
                <p>Monthly Disposable Income</p>
                <h4>${formatMoney(disposableIncome)}</h4>
            </div>

            <div class="overview-card">
                <p>Current Emergency Coverage</p>
                <h4>${(data.savings / data.essential).toFixed(2)} months</h4>
            </div>
        </div>
    </section>

    <section class="options-section">
        <h3>Compare Your Options</h3>

        <div class="options-grid">

            <div class="option-card">
                <h4>Buy Now</h4>
                <p class="option-description">Pay the full cost immediately.</p>

                <div class="result-detail">
                    <span>Purchase cost</span>
                    <strong>${formatMoney(totalPurchaseCost)}</strong>
                </div>

                <div class="result-detail">
                    <span>Savings after purchase</span>
                    <strong>${formatMoney(buyNowSavings)}</strong>
                </div>

                <div class="result-detail">
                    <span>Emergency coverage</span>
                    <strong>${buyNowCoverage.toFixed(2)} months</strong>
                </div>

                <div class="result-detail">
                    <span>Risk level</span>
                    <strong>${buyNowRisk}</strong>
                </div>
            </div>

            <div class="option-card">
                <h4>Wait ${data.waitingPeriod} Months</h4>
                <p class="option-description">Save more before purchasing.</p>

                <div class="result-detail">
                    <span>Savings before purchase</span>
                    <strong>${formatMoney(waitingSavings)}</strong>
                </div>

                <div class="result-detail">
                    <span>Savings after purchase</span>
                    <strong>${formatMoney(waitingSavingsAfterPurchase)}</strong>
                </div>

                <div class="result-detail">
                    <span>Emergency coverage</span>
                    <strong>${waitingCoverage.toFixed(2)} months</strong>
                </div>

                <div class="result-detail">
                    <span>Risk level</span>
                    <strong>${waitingRisk}</strong>
                </div>
            </div>

            <div class="option-card ${ recommendation.startsWith("Installment") ? "recommended-option" : "" }">
            ${recommendation.startsWith("Installment") ? '<p class="recommended-label">BEST AVAILABLE OPTION</p>' : ''}
                <h4>Installment</h4>
                <p class="option-description">Spread the cost over time.</p>

                <div class="result-detail">
                    <span>Monthly installment</span>
                    <strong>${formatMoney(monthlyInstallment)}</strong>
                </div>

                <div class="result-detail">
                    <span>Cash flow after payment</span>
                    <strong>${formatMoney(cashFlowAfterInstallment)}</strong>
                </div>

                <div class="result-detail">
                    <span>Payment affordability</span>
                    <strong>${paymentStatus}</strong>
                </div>

                <div class="result-detail">
                    <span>Total amount paid</span>
                    <strong>${formatMoney(totalInstallmentPaid)}</strong>
                </div>

                <div class="result-detail">
                    <span>Total interest</span>
                    <strong>${formatMoney(totalInterest)}</strong>
                </div>

                <div class="result-detail">
                    <span>Emergency coverage</span>
                    <strong>${installmentCoverage.toFixed(2)} months</strong>
                </div>

                <div class="result-detail">
                    <span>Risk level</span>
                    <strong>${installmentRisk}</strong>
                </div>
            </div>

        </div>
    </section>

    <section class="recommendation-section">
        <p class="results-eyebrow">DECISIONWISE RECOMMENDATION</p>
        <h3>${escapeHTML(recommendation)}</h3>
        <p>${escapeHTML(recommendationReason)}</p>
<div class="recommendation-guidance">
    <h4>Your next step</h4>

    <p>${recommendation.startsWith("Installment")
        ? "Compare repayment plans and consider a larger upfront payment to make your monthly instalments more comfortable."
        : recommendation.startsWith("Wait")
        ? "Continue saving consistently until you can afford the purchase while maintaining your emergency fund."
        : recommendation === "Buy Now"
        ? "You can proceed with the purchase, but make sure your essential expenses and emergency savings remain protected."
        : "Avoid committing to this purchase for now. Review your expenses, reduce financial pressure and build your savings first."}</p>

    <p>${recommendation.startsWith("Installment")
        ? "Keep your emergency savings untouched while planning the purchase."
        : recommendation.startsWith("Wait")
        ? "Review your savings progress before making the purchase."
        : recommendation === "Buy Now"
        ? "Check for additional costs before making your final payment."
        : "Reassess the purchase when your financial position improves."}</p>
</div>

    </section>

</div>
    `;

    results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});