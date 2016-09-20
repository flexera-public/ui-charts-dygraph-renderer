import app from '../app';
import Charts from '@rightscale/ui-charts';
import { DummyMetricsProvider } from '@rightscale/ui-charts/src/fixtures/dummyProvider';

app
  .inject(Charts.Data.GraphData, DummyMetricsProvider)
  .run((
    graphData: Charts.Data.GraphData,
    dummyProvider: DummyMetricsProvider
  ) => {
    // Register the dummy data provider once
    graphData.addProvider(dummyProvider);
  });
