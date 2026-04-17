import { useState, useEffect, useMemo } from 'react';
import styles from '../../styles/global_variables.scss';
import { getReportsByFilters } from '../../utils/queryBackend';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import NegotiationItem from '../../../NegotiationItem/NegotiationItem';

import useIsMobile from '../../../../hooks/useIsMobile';
import { getColumns } from '../../utils/column';
function filterMediatedNegotiations(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r && (Number(r.mediated_negotiations) === 1 || r.mediated_negotiations === true));
}

export default function PeaceCard(props) {
  const [peaceData, setPeaceData] = useState([]);
  const [fullPeaceData, setFullPeaceData] = useState([]);
  const [loader, setLoader] = useState(false);
  const isMobile = useIsMobile();

  const columns = useMemo(
    () => getColumns(isMobile, { omitMediationColumn: true }),
    [isMobile]
  );

  useEffect(() => {
    let start = '';
    let end = '';
    if (props.start && props.end) {
      start = props.start;
      end = props.end;
    }
    if (props.gw_number) {
      setLoader(true);
      const actorNames = [props.link?.source?.actor_name, props.link?.target?.actor_name].filter(Boolean).join(',');

      const periodDataPromise = getReportsByFilters(
        `?main_actors=${actorNames}&start=${start}&end=${end}&event_types=&actor_names=&gw_number=${props.gw_number}`
      ).then((responseData) => {
        setPeaceData(responseData.peace_data || []);
      });
      const fullDataPromise = getReportsByFilters(
        `?main_actors=${actorNames}&start=&end=&event_types=&actor_names=&gw_number=${props.gw_number}`
      ).then((responseData) => {
        if (responseData) {
          setFullPeaceData(responseData.peace_data || []);
        }
      });
      Promise.allSettled([periodDataPromise, fullDataPromise]).finally(() => {
        setLoader(false);
      });
    }
  }, [props.link?.source?.actor_name, props.link?.target?.actor_name, props.start, props.end, props.gw_number]);

  const rawData = props.full ? fullPeaceData : peaceData;
  const dataToRender = useMemo(() => filterMediatedNegotiations(rawData), [rawData]);

  return (
    <div className="events-card">
      <div className="events-card-wrapper">
        <div className="events-card-filter">
          <AppBar position="static" sx={{ backgroundColor: styles.textWhite }} className="event-type-wrapper" elevation={0}>
            <Toolbar variant="dense" className="event-type-toolbar" sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: '10px', sm: '20px' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  width: '100%',
                }}
              >
                <Typography
                  mx={1}
                  sx={{
                    fontSize: '16px',
                    fontWeight: '700',
                    margin: '0',
                    display: { xs: 'flex', md: 'flex' },
                    textTransform: 'none',
                    color: styles.darkBlue600,
                    letterSpacing: '0.75px',
                  }}
                >
                  Mediated Negotiations
                </Typography>
              </Box>
              <Box className="event-report-number-wrapper" sx={{ display: 'none' }}>
                <Typography fontSize="0.8rem" sx={{ px: 1, color: 'primary.contrastText' }} className="event-report-number">
                  {dataToRender?.length || 0} negotiations
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>
        </div>
        <div className="events-card-scroll-area">
          {loader ? (
            <Stack direction="row" justifyContent="center" alignItems="center" height="40vh">
              <CircularProgress sx={{ color: '#3D76AB' }} disableShrink />
            </Stack>
          ) : dataToRender?.length === 0 ? (
            <div className="no-data-events">
              <Typography fontSize="1.5rem">
                {'no mediated negotiations ' + (props.full ? 'in full data set' : 'in selected period')}
              </Typography>
            </div>
          ) : (
            <NegotiationItem peaceData={dataToRender} columns={columns} hideMediationInExpanded />
          )}
        </div>
      </div>
    </div>
  );
}
