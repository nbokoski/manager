import { pathOr } from 'ramda';
import * as React from 'react';
import { compose } from 'recompose';
import { withTheme, WithTheme } from 'src/components/core/styles';
import LongviewLineGraph from 'src/components/LongviewLineGraph';
import { generateUnits } from 'src/features/Longview/LongviewLanding/Gauges/Network';
import { statMax, sumNetwork } from 'src/features/Longview/shared/utilities';
import { AllData, getValues } from '../../../request';
import { convertData } from '../../../shared/formatters';
import { GraphProps } from './types';

export type CombinedProps = GraphProps & WithTheme;

export const NetworkGraph: React.FC<CombinedProps> = props => {
  const {
    clientAPIKey,
    end,
    isToday,
    lastUpdatedError,
    start,
    theme,
    timezone
  } = props;

  const [data, setData] = React.useState<Partial<AllData>>({});
  const [error, setError] = React.useState<string | undefined>();
  const request = () => {
    if (!start || !end) {
      return;
    }

    return getValues(clientAPIKey, {
      fields: ['network'],
      start,
      end
    })
      .then(response => {
        setError(undefined);
        setData(response);
      })
      .catch(_ => setError('Unable to retrieve network data.'));
  };

  const networkData = React.useMemo(
    () => sumNetwork(pathOr({}, ['Interface'], data.Network)),
    [data.Network]
  );

  React.useEffect(() => {
    request();
  }, [start, end, clientAPIKey, lastUpdatedError]);

  const _convertData = React.useCallback(convertData, [data, start, end]);

  const { rx_bytes, tx_bytes } = networkData;

  // Determine the unit based on the largest value.
  const max = Math.max(statMax(rx_bytes), statMax(tx_bytes));
  const maxUnit = generateUnits(max).unit;

  const formatNetwork = (valueInBytes: number | null) => {
    if (valueInBytes === null) {
      return valueInBytes;
    }

    const valueInBits = valueInBytes * 8;

    if (maxUnit === 'Mb') {
      // If the unit we're using for the graph is Mb, return the output in Mb.
      const valueInMegabits = valueInBits / 1024 / 1024;
      return Math.round(valueInMegabits * 100) / 100;
    } else {
      // If the unit we're using for the graph is Kb, return the output in Kb.
      const valueInKilobits = valueInBits / 1024;
      return Math.round(valueInKilobits * 100) / 100;
    }
  };

  return (
    <LongviewLineGraph
      title="Network"
      subtitle={maxUnit + '/s'}
      error={error}
      showToday={isToday}
      timezone={timezone}
      data={[
        {
          label: 'Inbound',

          borderColor: theme.graphs.emeraldGreenBorder,
          backgroundColor: theme.graphs.emeraldGreen,
          data: _convertData(rx_bytes, start, formatNetwork)
        },
        {
          label: 'Outbound',
          borderColor: theme.graphs.forestGreenBorder,
          backgroundColor: theme.graphs.forestGreen,
          data: _convertData(tx_bytes, start, formatNetwork)
        }
      ]}
    />
  );
};

const enhanced = compose<CombinedProps, GraphProps>(
  React.memo,
  withTheme
);

export default enhanced(NetworkGraph);
