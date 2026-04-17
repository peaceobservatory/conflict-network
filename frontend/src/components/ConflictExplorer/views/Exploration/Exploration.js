import styles from "../../styles/global_variables.scss";
import "./Exploration.scss";
import { useRef, useEffect, useState } from "react";
import { trackPromise, usePromiseTracker } from "react-promise-tracker";
// API functions
import {
  getDataByPeriod,
  getGraphData,
  getFilteredByActorNames,
} from "../../utils/queryBackend";
// MUI components
import Box from "@mui/material/Box";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
//Hooks
import useIsBelowMd from "../../../../hooks/useIsBelowMd";
//Constant & Content
import content from "../../../../content/content";
// components
import LocationGraphConfiguration from "../../components/LocationGraphConfiguration/LocationGraphConfiguration";
import PeriodSelectionBar from "../../components/PeriodSelectionBar/PeriodSelectionBar";
import SplitWindow from "../../components/SplitWindow/SplitWindow";
import ColourSettings from "../../components/ColourSettings/ColourSettings";
import Help from "../../components/PeriodSelectionBar/Help";
import InterCodeMapping from "../../components/InteractionLegend/InteractionLegend";
import SuggestedCitation from "../../../Popover/SuggestedCitation";
// external libraries
import intersection from "lodash/intersection";
import { Steps } from "intro.js-react";
import "intro.js/introjs.css";
import { saveData, loadData } from "../../components/LocationMap/db"; // adjust path

export default function Exploration(props) {
  
  const { promiseInProgress } = usePromiseTracker();
  const dummyGraph = { nodes: [], links: [], max_node: 0 };

  const exportRef = useRef();
  const [locationData, setLocationData] = useState([]);
  const [graphData, setGraphData] = useState(dummyGraph);
  const [needFetching, setNeedFetching] = useState(false);
  const [haveMapData, setHaveMapData] = useState(false);
  const [neighbourDegree, setNeighbourDegree] = useState(0);
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [nodeMinSize, setNodeMinSize] = useState(1);
  const [selectedInGraph, setSelectedInGraph] = useState([]);
  const [highlightState, setHighlightState] = useState({
    actorName: "",
    isHighlighted: false,
  });
  const [stepsEnabled, setStepsEnabled] = useState(false);
  const [loadDates, setLoadDates] = useState(false);
  const [nodeThreshold, setNodeThreshold] = useState(1);
  const [open, setOpen] = useState(false);
  const [layoutAlgorithm, setLayoutAlgorithm] = useState('force-directed');
  const [includePeaceData, setIncludePeaceData] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isBelowMd = useIsBelowMd(); // Check if screen is mobile
  const windowState = "mid";

  useEffect(() => {
    // prevents API call from being executed twice
    if (!props.gw_number || needFetching) return;
    setNeedFetching(true);
  }, [props.gw_number]);

  function triggerGraphFetching() {
    setHaveMapData((prev) => !prev);
  }


  useEffect(() => {
    const fetchGraphAndLocationData = async () => {
      if (!needFetching || !props.gw_number) return;

      try {
        //calling the graph API
        const graphPromise = trackPromise(getGraphData({
          start: startDate,
          end: endDate,
          gw_number: props.gw_number,
          include_peace_data: includePeaceData,
        }));

        // Skip location API call if the country is Syria
        const locationPromise = props.countryName === 'Syria' || haveMapData
          ? null 
          : trackPromise(getDataByPeriod({
              start: startDate,
              end: endDate,
              gw_number: props.gw_number,
            }));

        const [graphResult, locationResult] = await Promise.allSettled([
          graphPromise,
          locationPromise
        ]);

        // Handle Graph Data
        if (graphResult.status === "fulfilled" && graphResult.value) {
          setGraphData(graphResult.value);
        } else {
          setGraphData(dummyGraph);
          triggerGraphFetching();
        }
        if (locationPromise && locationResult?.status === "fulfilled") {
          setLocationData(locationResult.value?.details || []);
          setHaveMapData(true);
        }
        setLoadDates(true);
      } catch (error) {
        setGraphData(dummyGraph);
        setLocationData([]);
      }
    };

    fetchGraphAndLocationData();
  }, [needFetching, props.gw_number, props.country, includePeaceData]);


  

  useEffect(() => {
  if (props.countryName === 'Syria'){
    let isCancelled = false;
    let allChunks = [];
    // Check for cached data first
    loadData("cachedJsonData").then((cached) => {
      if (cached) {
    
        const filterWorker = new Worker(`${process.env.PUBLIC_URL}/filterWorker.js`);
  
        filterWorker.postMessage({
          data: cached,
          startDate,
          endDate,
          chunkSize: 1000,
        });
  
        filterWorker.onmessage = (e) => {
          const { success, chunk, done } = e.data;
  
          if (!success) {
            return;
          }
  
          if (chunk && !isCancelled) {
            allChunks = [...allChunks, ...chunk];
            setLocationData(allChunks); 
          }
  
          if (done) {
          }
        };
  
        filterWorker.onerror = (err) => {
        };
  
        // Cleanup worker on component unmount
        return () => {
          isCancelled = true;
          filterWorker.terminate();
        };
      } else {
       
        const jsonWorker = new Worker(`${process.env.PUBLIC_URL}/jsonWorker.js`);
  
        jsonWorker.postMessage({});
  
        jsonWorker.onmessage = (e) => {
          if (e.data.success) {
            const allData = e.data.data;
  
            saveData("cachedJsonData", allData);
  
            // Process the newly fetched data using the filter worker
            const filterWorker = new Worker(`${process.env.PUBLIC_URL}/filterWorker.js`);
  
            filterWorker.postMessage({
              data: allData,
              startDate,
              endDate,
              chunkSize: 1000,
            });
  
            filterWorker.onmessage = (e) => {
              const { success, chunk, done } = e.data;
  
              if (!success) {
                return;
              }
              if (chunk && !isCancelled) {
                allChunks = [...allChunks, ...chunk];
                setLocationData(allChunks); 
              }
              if (done) {
              }
            };
  
            filterWorker.onerror = (err) => {
            };
            return () => {
              isCancelled = true;
              filterWorker.terminate();
              jsonWorker.terminate();
            };
          }
        };
  
        jsonWorker.onerror = (err) => {
        };
        return () => {
          isCancelled = true;
          jsonWorker.terminate();
        };
      }
    });
  
    return () => {
      isCancelled = true;
    };
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  
  function filterEvents(selected_actors) {
    if (haveMapData) {
      const filteredActors = graphData.nodes
        .filter((node) => node["appearance"] >= nodeMinSize)
        .map((actor) => {
          return { name: actor["actor_name"], id: actor["actor_id"] };
        });
      let commonValues = filteredActors.map((actor) => actor["id"]);
      if (selected_actors.length > 0) {
        commonValues = intersection(commonValues, selected_actors);
      }
      const relevantNames = filteredActors
        .filter((actor) => commonValues.includes(actor.id))
        .map((actor) => actor.name);
      if (props.gw_number) {
        getFilteredByActorNames(
          `?names=${relevantNames}&start=${startDate}&end=${endDate}&gw_number=${props.gw_number}`
        ).then((responseData) => {
          const filteredEvents = responseData;
          setLocationData(filteredEvents);
        });
      }
    }
  }

  

  async function getByDate(start, end) {
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));

    if (props.gw_number) {
        try {
            // Conditional locationPromise if country is not Syria
            const locationPromise = props.countryName === 'Syria' 
                ? null 
                : trackPromise(
                    getDataByPeriod({
                        start: start.format("YYYY-MM-DD"),
                        end: end.format("YYYY-MM-DD"),
                        gw_number: props.gw_number,
                    })
                );
            const graphPromise = trackPromise(
                getGraphData({
                    start: start.format("YYYY-MM-DD"),
                    end: end.format("YYYY-MM-DD"),
                    gw_number: props.gw_number,
                    include_peace_data: includePeaceData,
                })
            );

            const [locationResponse, graphResponse] = await Promise.allSettled([
                locationPromise,
                graphPromise
            ]);

            // Handle location data (only if locationPromise was not null)
            if (locationPromise && locationResponse?.status === "fulfilled") {
                setLocationData(locationResponse.value?.details || []);
            }

            // Handle graph data
            if (graphResponse.status === "fulfilled") {
                setGraphData(graphResponse.value || []);
            } else {
                setGraphData(dummyGraph);
            }

        } catch (error) {
            setLocationData([]);
            setGraphData(dummyGraph);
        }
    }
}



  function setMinSize(minSize) {
    setNodeMinSize(minSize);
    const filteredActorNames = graphData.nodes
      .filter((node) => node["appearance"] >= minSize)
      .map((actor) => {
        return actor["actor_name"];
      });
    if (props.gw_number) {
      getFilteredByActorNames(
        `?names=${filteredActorNames}&start=${startDate}&end=${endDate}&gw_number=${props.gw_number}`
      ).then((responseData) => {
        const filteredEvents = responseData;
        setLocationData(filteredEvents);
      });
    }
  }

  function updateNeighbourDegree(newDegree) {
    setNeighbourDegree(newDegree);
  }

  function findActor(findState) {
    setHighlightState(findState);
  }

  function updateGraphSelection(newValue) {
    setSelectedInGraph(newValue);
  }

  // intro which is displayed when clicking on the help button
  const introState = {
    initialStep: 0,
    steps: [
      {
        title: "Welcome to the Conflict Networks Explorer",
        element: ".location-view",
        intro: `This tool will help you explore conflict-related information in ${props.countryName}.`,
      },
      {
        title: "Relevant Period",
        element: ".period-selection-items",
        intro:
          "Set the period for which you want to display data by setting the start and end dates. You can also select a different time unit, to set the period by month or year.",
      },
      {
        title: "Visualisation",
        element: ".export-location-wrapper",
        intro:
          "The data for your selected range will be displayed here. On the left, actors are represented as nodes in the graph. By clicking on the nodes, the map on the right is filtered for the selected actors.",
      },
      {
        title: "Map View",
        element: ".location-map-wrapper",
        intro:
          "On the map, events are coloured by their event type and can be hidden and displayed through the legend. By clicking on an event, more detailed information will be provided.",
      },
      {
        title: "Network Graph",
        element: ".location-graph-legend",
        intro:
          "Links between nodes represent interactions between actors. Depending on the type of interaction, they are shown as cooperative or oppositional links. The width of the links represents the number of mutual involvements. Links can be hidden from the graph through the legend. It is also possible to display links that reflect mediation efforts. Click on a link to get more information about the interactions between two actors.",
      },
      {
        title: "Node Interaction",
        element: ".location-graph-wrapper",
        intro:
          "You can click and drag nodes around to create layouts better suiting your needs.",
      },
      {
        title: content.FORCE_SIMULATION_GUIDANCE_TITLE,
        element: "#peor-force-toggle-button",
        intro: content.FORCE_SIMULATION_GUIDANCE_TEXT,
        position: "left",
      },
      {
        title: "Selection Degree",
        element: ".degree",
        intro: "Set whether to include first degree neighbours in the graph.",
      },
      {
        title: "Layout Options",
        element: ".layout-options",
        intro:
          "Choose how the network is arranged. Fruchterman-Reingold and Kamada-Kawai are force-directed layouts that pull strongly connected actors closer together and push less connected ones apart. Fruchterman-Reingold emphasizes the overall structure, while Kamada-Kawai often highlights clusters more clearly. Simple Circle places all nodes evenly around a circle.",
      },
      {
        title: "Minimum Size",
        element: ".minimum-size",
        intro:
          "Set the minimum number of events in which an actor needs to be involved for its node to appear in the graph.",
      },
      {
        title: "Peace Data",
        element: ".peace-data-toggle",
        intro:
          "Turn this on to display mediation efforts and mediator-party links in the network.",
      },
      {
        title: "Find Nodes",
        element: ".find-actors",
        intro: "You can highlight an actor's node in the graph.",
      },
      {
        title: "Reset Selection",
        element: ".graph-reset-select",
        intro: "Reset the node selection to display all events on the map.",
        tooltipClass: "resetTooltip",
        position: "right",
      },
      {
        title: "Icon Explanation",
        element: ".actor-interaction-legend",
        intro:
          "Each actor type is represented by a specific icon. Here you can learn what the different icons mean.",
      },
      {
        title: "Now it's your turn!",
        element: ".export-location-wrapper",
        intro: "Explore the events and relations to learn more.",
      },
    ],
  };

  const onExit = () => {
    setStepsEnabled(false);
  };

  function handleThresholdChange(event) {
    const newThreshold = event.target.value;
    setNodeThreshold(newThreshold);
    setMinSize(newThreshold);
  }

  return (
    <Box className="location-view">
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={promiseInProgress}
      >
        <CircularProgress color="inherit" disableShrink />
      </Backdrop>

      <div className="location-filter-view">
        <div>
          <Steps
            enabled={stepsEnabled}
            steps={introState.steps}
            initialStep={introState.initialStep}
            onExit={onExit}
          />
        </div>
        <PeriodSelectionBar
          gw_number={props.gw_number}
          getByDate={getByDate}
          initialStart={startDate}
          initialEnd={endDate}
          eventTypeColours={props.eventTypeColours}
          applyChangeEventTypeColours={props.applyChangeEventTypeColours}
          linkTypeColours={props.linkTypeColours}
          applyChangeGraphSettings={props.applyChangeGraphSettings}
          setStepsEnabled={setStepsEnabled}
          loadDates={loadDates}
          setLoadDates={setLoadDates}
        ></PeriodSelectionBar>
        {isBelowMd && (
          <>
            <Box
              sx={{
                margin: "10px 0",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <SuggestedCitation  tooltipTexts={content.CONFLICT_TOOLTIP_CONTENT_TEXT} copyText={content.CONFLICT_TOOLTIP_COPY_TEXT} />
            </Box>

            <Button
              onClick={() => setOpen(!open)}
              sx={{
                backgroundColor: styles.primaryColor,
                color: styles.darkBlue600,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "16px",
                padding: "22px 20px",
                borderRadius: "0",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                marginBottom: "10px",
                "&:hover": {
                  backgroundColor: styles.lightBlue40,
                },
              }}
            >
              <Typography sx={{ fontWeight: "700" }}>Filter</Typography>
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Button>
          </>
        )}

        <Collapse in={isBelowMd ? open : true} timeout={300}>
          <Box className="location-selections-wrapper">
            <LocationGraphConfiguration
              setMinSize={setMinSize}
              maxNode={graphData.max_node}
              setNeighbourDegree={updateNeighbourDegree}
              graphData={graphData}
              findActor={findActor}
              filterEvents={filterEvents}
              updateSelectedInGraph={updateGraphSelection}
              newThreshold={nodeThreshold}
              handleThresholdChange={handleThresholdChange}
              layoutAlgorithm={layoutAlgorithm}
              onLayoutChange={setLayoutAlgorithm}
              includePeaceData={includePeaceData}
              setIncludePeaceData={setIncludePeaceData}
            />
          </Box>
        </Collapse>
      </div>

      <Stack
        direction={"row"}
        sx={{
          display: { xs: "flex", md: "none" },
          gap: { xs: "15px", md: "0" },
          padding: { xs: "12px 12px", md: "0" },
          backgroundColor: { xs: styles.primaryColor, md: "transparent" },
          boxSizing: "border-box",
        }}
      >
        <ColourSettings
          eventTypeColours={props.eventTypeColours}
          applyChangeEventTypeColours={props.applyChangeEventTypeColours}
          linkTypeColours={props.linkTypeColours}
          applyChangeGraphSettings={props.applyChangeGraphSettings}
        ></ColourSettings>

        <Help setStepsEnabled={setStepsEnabled} />
      </Stack>
      {isBelowMd && <InterCodeMapping />}

      <Box className="location-view-block" sx={{ paddingTop: { md: "30px" } }}>
        <Box
          className="export-location-wrapper"
          ref={exportRef}
          sx={{
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: "70px", md: "30px" },
            position: "relative",
          }}
        >
          <SplitWindow
            gw_number={props.gw_number}
            start={startDate}
            end={endDate}
            graphData={graphData}
            neighbourDegree={neighbourDegree}
            filterEvents={filterEvents}
            location="left"
            selectedInGraph={selectedInGraph}
            minSize={nodeMinSize}
            windowState={windowState}
            actors={props.actors}
            actorNames={props.actorNames}
            eventTypeColours={props.eventTypeColours}
            linkTypeColours={props.linkTypeColours}
            highlightState={highlightState}
            updateGraphSelection={updateGraphSelection}
            labelSize={props.labelSize}
            linkWidth={props.linkWidth}
            nodeThreshold={nodeThreshold}
            layoutAlgorithm={layoutAlgorithm}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            includePeaceData={includePeaceData}
            countryName={props.countryName}
          ></SplitWindow>
          <SplitWindow
            gw_number={props.gw_number}
            start={startDate}
            end={endDate}
            location="right"
            windowState={windowState}
            events={locationData}
            actors={props.actors}
            actorNames={props.actorNames}
            eventTypeColours={props.eventTypeColours}
            linkTypeColours={props.linkTypeColours}
            countryName={props.countryName}
          ></SplitWindow>
        </Box>
      </Box>

      <Box
        className="data-source-info"
        sx={{ padding: { xs: "20px 12px", md: "30px 18px 20px 18px" } }}
      >
        <Typography sx={{ color: "#667785" }} fontSize={"14px"}>
          {content.EVENT_ACCESS_TEXT}
          <Link
            sx={{ color: "#667785" }}
            fontSize={"14px"}
            href={content.EVENT_ACCESS_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            {content.EVENT_ACCESS_LINK}
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
