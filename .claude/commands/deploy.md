We are going to push our changes to origin master, but first we need to make sure we do these things first:
1) Check all api unit tests pass
    1.1) If any tests fail, understand why they are failing. If you identify a common cause for their failure, fix them by failure cause. Do not fix any other tests until you have verified the ones you fixed are passing.
2) Check there are no linting errors for api and web
3) Check the builds work for api and web
4) Add all changes to git (git add .)
5) Commit the changes. Add an appropriate, brief message based on the changes introduced since the last commit.
6) Push to origin master