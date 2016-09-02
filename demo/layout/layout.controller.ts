import app from '../app';

@app.controller
@app.inject(['$state'])
export default class LayoutController {

  states: ng.ui.IState[];

  constructor(
    $state: ng.ui.IStateService
  ) {
    this.states = $state.get().filter(s => s.data && s.data.label);
  }
}
