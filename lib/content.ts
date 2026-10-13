export const sections = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Stack" },
] as const;

export const contact = {
  github: "https://github.com/ihhadjal",
  linkedin: "https://www.linkedin.com/in/iheb-hadj-ali-6910ba373/",
  email: "hadjali.pro@gmail.com",
  phone: { display: "07 69 45 21 28", href: "tel:+33769452128" },
};

export const experienceTags = ["Java", "Spring Boot", "Struts2", "Hibernate", "REST APIs", "Postman"];

export type Project = {
  slug: string;
  category: string;
  badge?: "FEATURED" | "INTERACTIVE";
  title: string;
  href?: string;
  description: string;
  tags: string[];
};

/** In display order; the card number comes from the position. */
export const projects: Project[] = [
  {
    slug: "neural-network",
    category: "DEEP LEARNING",
    badge: "FEATURED",
    title: "Neural Network from Scratch",
    href: "https://github.com/ihhadjal/multilayer_perceptron",
    description:
      "Multilayer network in Python and NumPy for binary classification of breast cancer diagnostic data — forward and backpropagation, Softmax and cross-entropy, no ML frameworks.",
    tags: ["Python", "NumPy"],
  },
  {
    slug: "eeg-bci",
    category: "SIGNAL PROCESSING",
    badge: "FEATURED",
    title: "EEG Brain-Computer Interface",
    description:
      "ML pipeline classifying motor actions and motor imagery from PhysioNet EEG recordings — filtering, event extraction, epoching and dimensionality reduction.",
    tags: ["Python", "MNE"],
  },
  {
    slug: "learn2slither",
    category: "REINFORCEMENT LEARNING",
    badge: "FEATURED",
    title: "Learn2Slither",
    href: "https://github.com/ihhadjal/Learn2Slither",
    description:
      "A Snake AI that learns to play entirely on its own, through trial and error, using Q-learning (and SARSA) reinforcement learning — no dataset, no supervision, just a reward signal.",
    tags: ["Python", "Q-learning", "SARSA"],
  },
  {
    slug: "mcp-server",
    category: "AI TOOLING",
    badge: "FEATURED",
    title: "MCP Server — Thaïs Hotel",
    href: "https://github.com/ihhadjal/MCP_SERVER",
    description:
      "A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with the Thaïs Hotel API for managing hotel and restaurant reservations through natural language conversation.",
    tags: ["TypeScript", "MCP", "REST API"],
  },
  {
    slug: "dslr",
    category: "CLASSIFICATION",
    title: "DSLR",
    href: "https://github.com/ihhadjal/DSLR",
    description:
      "Recreates Hogwarts' Sorting Hat with machine learning — data analysis, visualization and one-vs-all logistic regression.",
    tags: ["Python", "Pandas", "Matplotlib"],
  },
  {
    slug: "ft_linear_regression",
    category: "OPTIMIZATION",
    title: "ft_linear_regression",
    href: "https://github.com/ihhadjal/ft_linear_regression",
    description:
      "Linear regression trained with gradient descent from scratch — normalization, cost evaluation and the full train/predict workflow without ML libraries.",
    tags: ["Python", "NumPy"],
  },
  {
    slug: "ft_transcendence",
    category: "FULL-STACK",
    title: "ft_transcendence",
    href: "https://github.com/ihhadjal/ft_transcendence",
    description:
      "Full-stack web application with authentication, database, real-time features, and security, centered around a game of Pong, under strict technical constraints.",
    tags: ["TypeScript", "WebSockets", "Auth"],
  },
  {
    slug: "minishell",
    category: "SYSTEMS",
    badge: "INTERACTIVE",
    title: "minishell",
    href: "https://github.com/ihhadjal/minishell_42",
    description:
      "Implementation of a simple shell — parsing, pipes, redirections, heredocs, environment variables and signal handling.",
    tags: ["C", "Unix"],
  },
];

export const projectMeta = (p: Project) =>
  [String(projects.indexOf(p) + 1).padStart(2, "0"), p.category, p.badge].filter(Boolean).join(" · ");

export const skills = [
  { k: "Languages", v: "Python, C, C++, Java, TypeScript" },
  { k: "ML / Data", v: "NumPy, Pandas, MNE, Matplotlib, data preprocessing, neural networks, gradient descent" },
  { k: "Backend", v: "Spring Boot, REST APIs" },
  { k: "Systems & Tools", v: "Unix, Linux, Git, Docker, Postman" },
];
