# To update the dependencies, run this on Windows:
# del /f /s /q Gemfile.lock && bundle install && bundle lock --add-platform ruby x86_64-linux

source "https://rubygems.org"

gem "jekyll", "~> 4.3.4"
group :jekyll_plugins do
  gem "jekyll-sitemap"
  gem "jekyll-last-modified-at"
  gem "jekyll-default-layout"
  # gem "jekyll-minifier"
  gem 'jekyll-autoprefixer-v2'
  gem 'jekyll-redirect-from'
  gem "jekyll-git_metadata", git: "https://github.com/ctrlgroup/jekyll-git_metadata.git"
end
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
end
gem "wdm", "~> 0.2.0", :platforms => [:mingw, :x64_mingw, :mswin]
