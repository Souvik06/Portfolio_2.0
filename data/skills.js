/* Skills data. badge variant `v` maps to .badge-primary / .badge-secondary / .badge-accent */
window.PORTFOLIO_DATA = window.PORTFOLIO_DATA || {};
window.PORTFOLIO_DATA.skills = {
  eyebrow: "My Technical",
  title: "Skills",
  categories: [
    {
      title: "Test Automation",
      icon: "🎭",
      badges: [
        { t: "Playwright (TypeScript)", v: "primary" },
        { t: "Selenium WebDriver (Java)", v: "primary" },
        { t: "Cucumber (BDD)", v: "secondary" },
        { t: "Rest Assured", v: "secondary" },
        { t: "TestNG", v: "secondary" },
      ],
    },
    {
      title: "Programming Languages",
      icon: "💻",
      badges: [
        { t: "TypeScript", v: "primary" },
        { t: "JavaScript", v: "primary" },
        { t: "Java", v: "secondary" },
        { t: "Python", v: "secondary" },
      ],
    },
    {
      title: "Framework & Architecture",
      icon: "🏗️",
      badges: [
        { t: "Page Object Model (POM)", v: "primary" },
        { t: "Hybrid UI+API Frameworks", v: "primary" },
        { t: "Fixtures & Reusable Utilities", v: "secondary" },
        { t: "Modular Framework Design", v: "secondary" },
      ],
    },
    {
      title: "CI/CD & DevOps",
      icon: "⚙️",
      badges: [
        { t: "Azure DevOps", v: "primary" },
        { t: "GitHub Actions", v: "primary" },
        { t: "Jenkins", v: "secondary" },
        { t: "CI/CD Pipelines", v: "secondary" },
        { t: "PR Validation", v: "secondary" },
      ],
    },
    {
      title: "Agentic AI & AI-Assisted Testing",
      icon: "🧠",
      badges: [
        { t: "GitHub Copilot", v: "accent" },
        { t: "Playwright MCP Servers", v: "accent" },
        { t: "Multi-Agent Automation", v: "accent" },
      ],
    },
    {
      title: "Optimization",
      icon: "⚡",
      badges: [
        { t: "Parallel Execution", v: "secondary" },
        { t: "Sharding", v: "secondary" },
        { t: "Auto-waits", v: "secondary" },
        { t: "Retry Logic", v: "secondary" },
        { t: "Custom Reporters", v: "secondary" },
      ],
    },
    {
      title: "Reporting & Debugging",
      icon: "📊",
      badges: [
        { t: "Allure Reports", v: "secondary" },
        { t: "JUnit XML", v: "secondary" },
        { t: "HTML Reports", v: "secondary" },
        { t: "Trace Viewer", v: "secondary" },
      ],
    },
    {
      title: "Tools & Platforms",
      icon: "🧰",
      badges: [
        { t: "Postman", v: "secondary" },
        { t: "Bruno", v: "secondary" },
        { t: "BrowserStack", v: "secondary" },
        { t: "Perfecto", v: "secondary" },
        { t: "Jira", v: "secondary" },
        { t: "MySQL", v: "secondary" },
      ],
    },
  ],
};
