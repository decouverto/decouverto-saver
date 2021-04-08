require('angular');
require('ng-notie');

const { remote } = require('electron');
const { app } = remote;
const fs = require('fs-extra');
const path = require('path');
const ls = require('ls');
const githubRepositories = require('github-repositories');
const DownloadManager = remote.require('electron-download-manager');

const mainFolder = path.join(app.getPath('desktop'), 'Sauvegarde Decouverto');

angular.module('UI', ['ngNotie'])
    .controller('UICtrl', ($scope, notie, $http) => {

        $http({
            method: 'GET',
            url: 'https://decouverto.fr/save/index.json'
        }).then(res => {
            $scope.walks = res.data;
            fs.mkdirp(path.join(mainFolder, 'balades'), err => {
                if (err) return notie.alert(3, 'Impossible de créer le dossier');
                fs.writeFile(path.join(mainFolder, 'balades', 'index.json'), JSON.stringify(res.data), 'utf8', err => {
                    if (err) {
                        notie.alert(3, 'Impossible de sauvegarder la liste des balades');
                    } else {
                        notie.alert(1, 'La liste des balades a bien été téléchargé.');
                    }
                    // do modification on data when file is saved
                    for (let file of ls(path.join(mainFolder, 'balades', '*'))) {
                        if (file.name != 'index') {
                            let found = $scope.walks.find(element => {
                                return element.id == file.name;
                            });
                            if (found) {
                                found.downloaded = true;
                            }
                        }
                    }
                    $scope.$apply();
                });
            });
        }, () => {
            notie.alert(3, 'Une erreur a eu lieu dans la synchronisation avec le site internet.');
        })

        githubRepositories('decouverto').then(data => {
            $scope.repos = data;
            $scope.$apply();
        });

        function displayProgress (progress) {
            $scope.progress = Math.round(10*progress)/10;
            $scope.$apply();
        }
        function displayResult (finishedCount, errorsCount) {
            $scope.result = {
                finished: finishedCount,
                errors: errorsCount
            };
            $scope.$apply();
        }

        $scope.downloadRepo = function (repo) {
            fs.mkdirp(path.join(mainFolder, 'logiciels', 'tmp'), err => {
                if (err) return notie.alert(3, 'Impossible de créer le dossier');
                DownloadManager.download({
                    url: 'https://codeload.github.com/' + repo.full_name + '/zip/' + repo.default_branch,
                    path: path.join('logiciels', 'tmp'),
                    onProgress: displayProgress
                }, err => {
                    if (err) return notie.alert(3, 'Une erreur a eu lieu lors du téléchargement.');
                    let filename = repo.name + '-' + repo.default_branch + '.zip';
                    fs.copy(path.join(mainFolder, 'logiciels', 'tmp', filename), path.join(mainFolder, 'logiciels', filename), err => {
                        if (err) return notie.alert(3, 'Une erreur a eu lieu lors de la copie.');
                        fs.remove(path.join(mainFolder, 'logiciels', 'tmp'), err => {
                            if (err) return notie.alert(3, 'Une erreur a eu lieu lors du nettoyage.');
                            repo.downloaded = true;
                            $scope.$apply();
                            notie.alert(1, 'Téléchargement réussi.');
                        });
                    });
                });
            });
        };

        $scope.downloadAllRepos = function () {
            let links = [];
            let filenames = [];
            $scope.repos.forEach((repo) => {
                links.push('https://codeload.github.com/' + repo.full_name + '/zip/' + repo.default_branch);
                filenames.push(repo.name + '-' + repo.default_branch + '.zip');
            });
            DownloadManager.bulkDownload({
                urls: links,
                onResult: displayResult,
                path: path.join('logiciels', 'tmp')
            }, function (err, finished) {
                if (err) return notie.alert(3, 'Une erreur a eu lieu lors du téléchargement.');
                try {
                    filenames.forEach(el => {
                        fs.copySync(path.join(mainFolder, 'logiciels', 'tmp', el), path.join(mainFolder, 'logiciels', el));
                    });
                    fs.removeSync(path.join(mainFolder, 'logiciels', 'tmp'));
                    if (finished.length == links.length) {
                        notie.alert(1, 'Téléchargement réussi.');
                        $scope.repos.forEach(el => {
                            el.downloaded = true;
                        });
                        $scope.$apply();
                    } else {
                        notie.alert(2, 'Des logiciels n\'ont pas été téléchargés.');
                    }
                } catch (e) {
                    notie.alert(3, 'Une erreur a eu lieu lors de la copie des logiciels.');
                }
            });
        }

        $scope.downloadWalk = function (walk) {
            fs.mkdirp(path.join(mainFolder, 'balades', 'tmp'), err => {
                if (err) return notie.alert(3, 'Impossible de créer le dossier');
                DownloadManager.download({
                    url: 'https://decouverto.fr/save/' + walk.id + '.zip',
                    path: path.join('balades', 'tmp'),
                    onProgress: displayProgress
                }, err => {
                    if (err) return notie.alert(3, 'Une erreur a eu lieu lors du téléchargement.');
                    fs.copy(path.join(mainFolder, 'balades', 'tmp', walk.id + '.zip'), path.join(mainFolder, 'balades', walk.id + '.zip'), err => {
                        if (err) return notie.alert(3, 'Une erreur a eu lieu lors de la copie.');
                        fs.remove(path.join(mainFolder, 'balades', 'tmp'), err => {
                            if (err) return notie.alert(3, 'Une erreur a eu lieu lors du nettoyage.');
                            walk.downloaded = true;
                            $scope.$apply();
                            notie.alert(1, 'Téléchargement réussi.');
                        });
                    });
                });
            });
        };

        function downloadWalks(ids) {
            if (!ids.length) {
                return notie.alert(1, 'Rien à télécharger.');
            }
            let links = [];
            ids.forEach(id => {
                links.push('https://decouverto.fr/save/' + id + '.zip');
            });
            DownloadManager.bulkDownload({
                urls: links,
                onResult: displayResult,
                path: path.join('balades', 'tmp')
            }, function (err, finished) {
                if (err) return notie.alert(3, 'Une erreur a eu lieu lors du téléchargement.');
                try {
                    let files = finished.map(x => x.replace(/^.*[\\\/]/, ''));
                    files.forEach(el => {
                        fs.copySync(path.join(mainFolder, 'balades', 'tmp', el), path.join(mainFolder, 'balades', el));
                    });
                    fs.removeSync(path.join(mainFolder, 'balades', 'tmp'));
                    if (finished.length == links.length) {
                        notie.alert(1, 'Téléchargement réussi.');
                    } else {
                        notie.alert(2, 'Des balades n\'ont pas été téléchargés.');
                    }
                    for (let file of ls(path.join(mainFolder, 'balades', '*'))) {
                        if (file.name != 'index') {
                            let found = $scope.walks.find(element => {
                                return element.id == file.name;
                            });
                            if (found) {
                                found.downloaded = true;
                            }
                        }
                    }
                    $scope.$apply();
                } catch (e) {
                    notie.alert(3, 'Une erreur a eu lieu lors de la copie des balades.');
                }
            });
        };

        $scope.downloadAllWalks = function () {
            downloadWalks($scope.walks.map(x => x.id));
        };
        $scope.syncWalks = function () {
            downloadWalks($scope.walks.filter(x => x.downloaded != true).map(x => x.id));
        };
    });