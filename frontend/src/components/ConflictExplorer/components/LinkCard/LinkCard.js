import './LinkCard.scss';
import {useState, useEffect} from 'react';
import styles from '../../styles/global_variables.scss';
// MUI components
import Box from '@mui/material/Box';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ActorIcon from '../ActorIcon/ActorIcon';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import InfoIcon from '@mui/icons-material/Info';
// components
import ActorCard from '../ActorCard/ActorCard';
import EventsCard from '../EventsCard/EventsCard';
import PeaceCard from '../PeaceCard/PeaceCard';
import NodeSwitch from "../ActorCard/NodeSwitch";
// external libraries
import moment from 'moment';

export default function LinkCard(props) {
    const [eventsPeriodChecked, setEventsPeriodChecked] = useState(false);
    const [linkColour, setLinkColour] = useState('');
    const [linkStroke, setLinkStroke] = useState('');
    const [openActorCard, setOpenActorCard] = useState(false);
    const [selectedActor, setSelectedActor] = useState('');

    useEffect(() => {
        if(props.linkTypeColours && props.link){
            if (props.link.linkType === 2) {
                setLinkColour(props.linkTypeColours['mediation']?.['colour'] || styles.darkBlue)
                setLinkStroke('')
            } else {
                const linkType = ((props.link.linkType === 1)? 'opposition' : 'cooperation');
                setLinkColour(props.linkTypeColours[linkType]['colour'])
                setLinkStroke(props.linkTypeColours[linkType]['stroke'])
            }
        }
    }, [props.linkTypeColours, props.link])

    const handleClose = (event) => {
        setEventsPeriodChecked(false);
        props.onClose();
    }

    function handleEventsPeriodChange(){
        setEventsPeriodChecked(!eventsPeriodChecked);
    }

    function getActor(name){
        name = name.trim()
        const found_by_name = props.actors.find(actor => (actor.getName() === name));
        if(!found_by_name){
            return null
        }
        else{
            return found_by_name
        }
    }

    function showActorCard(actor){
        setSelectedActor(actor.getName())
        setOpenActorCard(true)
    }

    function hideActorCard(){
        setOpenActorCard(false);
    };

    // Create a lightweight actor-like object for mediation nodes so ActorIcon
    // renders the same glyph (light circle + black handshake) as the graph.
    const mediationActor = {
        actorType: 'mediation',
        eventTypeSummary: {},
        getName: () => 'Mediation',
    };

    return (
        <div className='link-card-dialog-wrapper'>
            {getActor(selectedActor)? 
            <ActorCard
            gw_number={props.gw_number}
            open={openActorCard}
            onClose={hideActorCard}
            actor={getActor(selectedActor)}
            actorName={selectedActor}
            start={props.start}
            end={props.end}
            actors={props.actors}
            fullPeriod={false}
            eventTypeColours={props.eventTypeColours}
            >
            </ActorCard>
            :null}
            <Dialog 
            onClose={handleClose} 
            PaperProps={{sx: {width: "95%", maxWidth: "100%", height: {xs: "fit-content", md: "100%"}, borderRadius: "20px"}}}
            open={props.open}
            container={props.container}
            >
                <DialogTitle sx={{padding: '0px 0px 10px 0px' }} className='link-dialog-title'>
                    <Box className='link-card-title-wrapper' sx={{ gap: {xs: "10px"}, flexDirection: {xs: "column", sm: "row"}}}>
                        <div className='link-title-actor'>
                            {(!props.actor1 && props.link?.linkType === 2) ? (
                                <Box sx={{ backgroundColor: styles.primaryLight, borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ActorIcon dim={50} actor={mediationActor} colour={styles.typeIconColor} eventTypeColours={props.eventTypeColours}></ActorIcon>
                                </Box>
                            ) : (
                                <ActorIcon dim={50} actor={props.actor1} colour={styles.typeIconColor} eventTypeColours={props.eventTypeColours}></ActorIcon>
                            )}
                            <Typography fontSize='1rem' sx={{marginLeft: '5px', marginRight:'10px'}}>{props.actor1 ? props.actor1.getName() : props.link?.source?.actor_name}</Typography>
                            {props.actor1 && (
                            <IconButton
                            onClick={() => showActorCard(props.actor1)}
                            size='small'
                            >
                                <InfoIcon 
                                sx={{ color:'secondary'}}
                                fontSize='small'
                                ></InfoIcon>
                            </IconButton>
                            )}
                        </div>
                        <Box className='link-link-wrapper' sx={{padding: {xs: "0", sm: "0 14px"} }} >
                            <svg className='dash-icon'>
                                <line 
                                stroke={linkColour}
                                strokeDasharray={linkStroke}
                                x1='0'
                                y1='0'
                                x2='100%'
                                y2='0'
                                strokeWidth='10'
                                transform='translate(0,5)'
                                ></line>
                            </svg>
                        </Box>
                        <div className='link-title-actor'>
                            {(!props.actor2 && props.link?.linkType === 2) ? (
                                <Box sx={{ backgroundColor: styles.primaryLight, borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ActorIcon dim={50} actor={mediationActor} colour={styles.typeIconColor} eventTypeColours={props.eventTypeColours}></ActorIcon>
                                </Box>
                            ) : (
                                <ActorIcon dim={50} actor={props.actor2} colour={styles.typeIconColor} eventTypeColours={props.eventTypeColours}></ActorIcon>
                            )}
                            <Typography fontSize='1rem' sx={{marginLeft: '5px', marginRight:'10px'}}>{props.actor2 ? props.actor2.getName() : props.link?.target?.actor_name}</Typography>
                            {props.actor2 && (
                            <IconButton
                            onClick={() => showActorCard(props.actor2)}
                            size='small'
                            >
                                <InfoIcon 
                                sx={{ color:'secondary'}}
                                fontSize='small'
                                ></InfoIcon>
                            </IconButton>
                            )}
                        </div>
                    </Box>
                {props.onClose ? (
                <IconButton
                aria-label="close"
                onClick={props.onClose}
                sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                }}
                >
                <CloseIcon />
                </IconButton>
            ) : null}
                </DialogTitle>
                <DialogContent>
                    <Box className='event-card-wrapper'>
                        {(!props.fullPeriod && props.link?.linkType !== 2) ? <Stack direction="row" spacing={1} alignItems="center" sx={{ padding: { xs: '20px 20px'}, gap: '20px', backgroundColor: styles.primaryColor, marginBottom: '5px', alignItems: {xs: "flex-start", sm: "center"}, flexDirection: {xs: "column", sm: "row"}}}>
                            <Typography fontSize='16px' color={styles.extraDarkBlue}>Period ({moment(props.start).format('DD.MM.YY')} - {moment(props.end).format('DD.MM.YY')})</Typography>                            
                            <NodeSwitch
                                selectNeighbours={eventsPeriodChecked}
                                onChange={handleEventsPeriodChange}
                            />
                        </Stack>
                        :null}
                        {props.link && props.link.linkType === 2 ? (
                            <PeaceCard
                                gw_number={props.gw_number}
                                full={eventsPeriodChecked}
                                actors={props.actors}
                                mainActors={[props.actor1, props.actor2]}
                                start={props.start}
                                end={props.end}
                                eventTypeColours={props.eventTypeColours}
                                link={props.link}
                            />
                        ) : (
                            <EventsCard
                                linkCardActors={true}
                                gw_number={props.gw_number}
                                full={eventsPeriodChecked}
                                actors={props.actors}
                                mainActors={[props.actor1, props.actor2]}
                                start={props.start}
                                end={props.end}
                                eventTypeColours={props.eventTypeColours}
                                link={props.link}
                            ></EventsCard>
                        )}
                    </Box>         
                </DialogContent>
            </Dialog>
        </div>
    );
}
