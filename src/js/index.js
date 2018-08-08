require('angular');
require('ng-notie');

const { ipcRenderer, remote } = require('electron');
const { dialog, app, shell } = remote;
const fs = require('fs-extra');
const pathModule = require('path');
const githubRepositories = require('github-repositories');

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
            $scope.$apply()
        });
})