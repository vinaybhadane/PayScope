# PayScope Security Policy

## Report a vulnerability

Use the repository’s private reporting form for suspected vulnerabilities in the PayScope website, API or code. The maintainers will use the private thread to discuss the impact, coordinate a fix and agree on disclosure. [Report a vulnerability privately](https://github.com/vinaybhadane/PayScope/security/advisories/new)

Include the affected page or API route, the version or commit if known, what you observed and the possible impact. Use a workspace you control and synthetic data. Redact personal information from screenshots and logs. Keep real statements, credentials and session tokens out of the report.

## Supported versions

Security reports apply to the current PayScope deployment and code on the default `main` branch. If you use a fork or older build, include the commit so the maintainers can check whether the current code is affected.

## Deployment practices

- Store database credentials, API keys and signing secrets in your hosting provider’s secret settings. Use separate databases and credentials for development, automated tests and production.
- Serve the website and API over HTTPS. Set browser access to explicit frontend origins and use a unique session signing secret for each environment.
- The API verifies workspace ownership before returning financial records and limits upload size, import job capacity and request rates.
- When enabling Firebase notes, deploy the repository’s Firestore rules. Use backend-only credentials for Neo4j and rotate any credential exposed in a repository or log. [Firestore rules](firestore.rules)

For information about statement uploads and workspace data, see the [PayScope privacy policy](https://payscope-web.onrender.com/privacy).
