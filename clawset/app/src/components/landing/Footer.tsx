export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12 mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <span className="text-brand-red font-bold font-mono text-lg">🦞 Clawhatch</span>
            <p className="text-sm text-muted-foreground">
              The setup wizard for OpenClaw. Get your AI assistant running in minutes.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/wizard" className="hover:text-foreground transition-colors">Setup Wizard</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="/troubleshooting" className="hover:text-foreground transition-colors">Troubleshooting</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://github.com/OpenClaw" className="hover:text-foreground transition-colors">GitHub</a></li>
              <li><a href="https://github.com/OpenClaw/clawdbot/wiki" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="mailto:support@clawhatch.com" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Clawhatch. Built with 🦀 by OpenClaw.</p>
          <p className="font-mono">clawhatch.com</p>
        </div>
      </div>
    </footer>
  );
}
