import Module from '@rightscale/ui-angular-decorators';

let app = new Module('demoApp', ['rs.dygraphsRenderer', 'ui.router']);
export default app;

app
  .inject('$provide')
  .config((
    $provide: ng.auto.IProvideService,
  ) => {
    // Hijacks the Angular exception handler to rethrow exceptions that work with source maps on Chrome
    $provide.decorator('$exceptionHandler', ($delegate: any) => {
      return (exception: any, cause: any) => {
        setTimeout(() => {
          throw exception;
        });
      };
    });
  });
