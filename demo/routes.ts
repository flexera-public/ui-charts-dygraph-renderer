import app from './app'
import LayoutController from './layout/layout.controller'
import {DygraphsController} from './dygraphs/dygraphs.controller'

app.config(['$stateProvider', '$urlRouterProvider'], (
  $stateProvider: ng.ui.IStateProvider,
  $urlRouterProvider: ng.ui.IUrlRouterProvider
) => {
  $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('layout', {
      abstract: true,
      templateUrl: 'layout/layout.html',
      controller: LayoutController,
      controllerAs: '$ctrl'
    })
    .state('layout.home', {
      url: '/',
      templateUrl: 'home/home.html',
      data: {
        label: 'Home'
      }
    })
    .state('layout.dygraphs', {
      url: '/dygraphs',
      templateUrl: 'dygraphs/dygraphs.html',
      controller: DygraphsController,
      controllerAs: '$ctrl',
      data: {
        label: 'Dygraphs Renderer'
      }
    })
});
