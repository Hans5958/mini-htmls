# Batch command: 
# del /f /s /q Gemfile.lock && bundle install && bundle lock --add-platform ruby x86_64-linux

source "https://rubygems.org"

gem "jekyll", "~> 4.2.0"
group :jekyll_plugins do
  gem "jekyll-sitemap"
  gem "jekyll-last-modified-at"
  gem "jekyll-default-layout"
  # gem "jekyll-minifier"
  gem "jekyll-autoprefixer"
  gem 'jekyll-redirect-from'
  gem "jekyll-git_metadata", git: "https://github.com/ctrlgroup/jekyll-git_metadata.git"
end
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
end
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Hotfix to avoid using eventmachine using 1.2.7-x64-mingw32 which errors on Windows.
# https://github.com/eventmachine/eventmachine/issues/820
gem "eventmachine", "1.2.7", git: "https://github.com/eventmachine/eventmachine.git", tag: "v1.2.7"

# Hotfix to avoid execjs going 2.8 and up to make it work on CI/Linux (broken on ~> 2.8) and Windows (broken on ~> 2.9).
# https://github.com/rails/execjs/issues/99
gem 'execjs', '< 2.8'