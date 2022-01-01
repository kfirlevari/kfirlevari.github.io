rm -rf ./_site/
bundle exec jekyll build
cp -r ./_site/* ../kfirlevari.github.io/
