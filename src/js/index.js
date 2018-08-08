require('angular');
require('ng-notie');

const { ipcRenderer, remote } = require('electron');
const { dialog, app, shell } = remote;
const fs = require('fs-extra');
const path = require('path');
const githubRepositories = require('github-repositories');
const DownloadManager = remote.require('electron-download-manager');

const mainFolder = path.join(app.getPath('desktop'), 'Sauvegarde Decouverto');
// app.getPath('desktop')

angular.module('UI', ['ngNotie'])
    .controller('UICtrl', ($scope, notie, $http) => {
       
        $http({
            method: 'GET',
            url: 'https://decouverto.fr/walks/index.json'
        }).then(res  => {
            $scope.walks = res.data;
        }, () => {
            notie.alert(3, 'Une erreur a eu lieu dans la synchronisation avec le site internet.');
        })

        githubRepositories('decouverto').then(data => {
            $scope.repos = data;
            $scope.$apply();
        });

        $scope.downloadRepo = function (repo) {
            fs.mkdirp(path.join(mainFolder, 'logiciels', 'tmp'), function (err) {
                if (err) return notie.alert(3, 'Impossible de créer le dossier');
                DownloadManager.download({
                    url: 'https://codeload.github.com/' + repo.full_name + '/zip/' + repo.default_branch,             
                    path: path.join('logiciels', 'tmp')
                }, err => {
                    if (err) return notie.alert(3, 'Une erreur a eu lieu lors du téléchargement.');
                    let filename = repo.name + '-' + repo.default_branch + '.zip';
                    fs.copy(path.join(mainFolder, 'logiciels', 'tmp', filename), path.join(mainFolder, 'logiciels', filename), (err) => {
                        if (err) return notie.alert(3, 'Une erreur a eu lieu lors de la copie.');
                        fs.remove(path.join(mainFolder, 'logiciels', 'tmp'), (err) => {
                            if (err) return notie.alert(3, 'Une erreur a eu lieu lors du nettoyage.');
                            notie.alert(1, 'Téléchargement réussi.');
                        });
                    });
                });
            });
        };
})