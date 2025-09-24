import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('border-t bg-muted/30 mt-16', className)}>
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary-foreground"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-foreground">PrescriberPoint</h3>
                <p className="text-sm text-muted-foreground">AI-Enhanced Drug Information</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-4">
              Comprehensive drug information platform combining FDA data with AI-powered insights
              for healthcare professionals. Always consult with qualified healthcare providers for
              medical decisions.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                FDA Approved Data
              </Badge>
              <Badge variant="secondary" className="text-xs">
                AI Enhanced
              </Badge>
              <Badge variant="outline" className="text-xs">
                Healthcare Professional Focus
              </Badge>
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Data Sources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                FDA Drug Labels
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                AI Enrichment
              </li>
            </ul>
          </div>

          {/* Important Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Search Drugs
                </Link>
              </li>
              <li>
                <a
                  href="https://www.fda.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  FDA.gov ↗
                </a>
              </li>
              <li>
                <a
                  href="https://dailymed.nlm.nih.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  DailyMed ↗
                </a>
              </li>
              <li>
                <a
                  href="https://www.nlm.nih.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  NLM ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <p>© 2024 PrescriberPoint. Information for healthcare professionals.</p>
              <p className="text-xs mt-1">
                This platform provides drug information for educational purposes. Always verify with
                official sources and consult healthcare providers.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>•</span>
              <span>AI-powered insights</span>
              <span>•</span>
              <span>Version 1.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
