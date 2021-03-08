source "https://rubygems.org"
gem "jekyll", "~> 3.9.0"
# gem "minima", "~> 2.0"
group :jekyll_plugins do
  # gem "jekyll-feed", "~> 0.6"
end
install_if -> { RUBY_PLATFORM =~ %r!mingw|mswin|java! } do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
end
gem "wdm", "~> 0.1.0", :install_if => Gem.win_platform?
gem "kramdown-parser-gfm"
# gem "eventmachine" "1.2.7"

# This can't run!
# gem "github-pages", group: :jekyll_plugins