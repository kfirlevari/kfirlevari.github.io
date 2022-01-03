rm -rf ./_site/
JEKYLL_ENV=production bundle exec jekyll build
cp -r ./_site/* ../kfirlevari.github.io/
