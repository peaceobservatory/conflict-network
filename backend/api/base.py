import os
import logging
import pandas as pd
import asyncio
import anyio
from fastapi import APIRouter, status
from utils import actor_functions as af
from utils import helper_functions as hf
from utils.responses import success_response, error_response
from utils.redis import RedisClient
from config.specifications import (
    DATA_NOT_FOUND,
    DATA_EVENT_DATE_DT_COL,
    INTERNAL_SERVER_ERROR_MSG,
    LOG_CSV_FILE_MSG,
    FRONTEND_EVENT_COLS,
    DATA_DATE_START_COL,
    EVENT_TYPE_COLOURS as ETC_PATH,
    LINK_TYPE_COLOURS as LTC_PATH,
    BACKGROUND_XLSX_FILE,
    DATA_SIDE_A_COL,
    DATA_SIDE_B_COL,
    MULTIPLE_SEPARATOR,
    DATA_ID_COL,
    DATA_EVENT_TYPE_COL,
    BY_COUNTRY_DIR,
    COUNTRIES_GW_FILE,
    PP_THIRD_PARTY_SHORT_COL,
    PP_THIRD_PARTY_COL,
)
import json
import re
from config.specifications import CURRENT_YEAR

router = APIRouter()
logger = logging.getLogger("conflict_network")
LIB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(LIB_DIR, "data")
CONFIG_DIR = os.path.join(LIB_DIR, "config")
redis_client = RedisClient()

from config.specifications import CONFIG_BASE_DIR

with open(os.path.join(LIB_DIR, CONFIG_BASE_DIR, ETC_PATH), "r") as f:
    EVENT_TYPE_COLOURS = json.load(f)

with open(os.path.join(LIB_DIR, CONFIG_BASE_DIR, LTC_PATH), "r") as f:
    LINK_TYPE_COLOURS = json.load(f)

def getNameByID(id, gw_number):
    """
    Helper function to get the name of an actor by its ID.

    Args:
        id (str):           The ID of the relevant actor.
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        str:                The relevant name for a given ID.
    """
    try:
        actors = hf.get_actors(gw_number)
        relevantActors = [actor for actor in actors.actors if (actor.id == id)]
        if len(relevantActors) == 1:
            relActor = relevantActors[0].originalName
        else:
            raise ValueError("(base/getNameByID: Found multiple actors for the same ID")
        return relActor
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
        
@router.get("/get-events-year")
async def get_events_year():
    """
    Get the year of the current data that is used.

    Returns:
        int: year of data that is used for conflict explorer
    """

    try:
        data = dict(current_year=CURRENT_YEAR)
        return success_response(
            data=data,
            message="Successfully retrieved the current year's data",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.put("/set-event-type-colours")
async def set_event_type_colours(
    new_colours: dict[str, str],
):  # this is only possible with python > 3.10
    """
    Set the current colour assignment for the event types.

    Args:
        newColours (dict(str, str)): New colour assignment for the event types.

    Returns:
        dict
    """

    try:
        EVENT_TYPE_COLOURS = new_colours
        data = dict(event_type_colours=EVENT_TYPE_COLOURS)
        return success_response(
            data=data,
            message="Successfully retrieved the current color assignment for event types",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
@router.put("/set-link-type-colours")
async def set_link_type_colours(
    new_colours: dict[str, dict],
):  # this is only possible with python > 3.10
    """
    Set the current colour assignment for the link types.

    Args:
        newColours (dict(str, str)): New colour assignment for the link types.

    Returns:
        dict
    """
    try:
        LINK_TYPE_COLOURS = new_colours
        data = dict(link_type_colours=LINK_TYPE_COLOURS)
        return success_response(
            data=data,
            message="Successfully set the current color assignment for link types",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@router.get("/get-event-type-colours")
async def get_event_type_colours():
    """
    Get the current colour assignment for the event types.

    Args:
        None

    Returns:
        dict
    """
    try:
        data = dict(event_type_colours=EVENT_TYPE_COLOURS)
        return success_response(
            data=data,
            message="Successfully retrieved the current color assignment for event types",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@router.get("/get-link-type-colours")
async def get_link_type_colours():
    """
    Get the current colour assignment for the link types.

    Args:
        None

    Returns:
        dict
    """

    try:
        data = dict(link_type_colours=LINK_TYPE_COLOURS)
        return success_response(
            data=data,
            message="Successfully retrieved the current color assignment for link types",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@router.get("/get-reports-by-filters")
async def get_reports_by_filters(main_actors, start, end, event_types, actor_names, gw_number):
    """
    Filter the data set by ids, period, event types and/or actor names.
    Arguments which should not be considered for filtering should be empty strings.

    Args:
        mainActors (str):   Names of actor(s) to get reports for.
                            Two names imply link reports, one actor implies all reports.
                            Empty string if not applicable.
        start (str):        Indicating the start date for the period filter. Empty string if not applicable.
        end (str):          Indicating the end date for the period filter. Empty string if not applicable.
        eventTypes (str):   All event types which should be considered. Empty string if not applicable.
        actorNames (str):   All actor names which should be considered. Empty string if not applicable.
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        dict: Dictionary only including events fulfilling the specified filter criteria.
    """
    try:

        cache_key = f"ged_{gw_number}.csv"
        background_cache_key = "backgrounds_xlsx"
        cached_data = redis_client.get_value(cache_key)
        cached_backgrounds = redis_client.get_value(background_cache_key)
        if cached_data.get("value") is not None and cached_backgrounds.get("value") is not None:
            data = json.loads(cached_data.get("value"))
            event_dataset = pd.read_json(data, orient="records")
            data = json.loads(cached_backgrounds.get("value"))
            backgrounds = pd.read_json(data, orient="records")
            event_dataset[DATA_EVENT_DATE_DT_COL] = pd.to_datetime(event_dataset[DATA_DATE_START_COL])

        else:
            logger.info(LOG_CSV_FILE_MSG)
            events_filename =  DATA_DIR+"/"+BY_COUNTRY_DIR+"/"+"ged_"+str(gw_number) + ".csv"
            event_dataset = await anyio.to_thread.run_sync(hf.prepare_df, events_filename)
            backgrounds = pd.read_excel(
                DATA_DIR+"/"+BACKGROUND_XLSX_FILE, sheet_name="Sheet2"
            )
        event_types = event_types.split(",")
        actor_names = actor_names.split(",")
        main_actors = main_actors.split(",")
        df = event_dataset.copy()

        if (len(actor_names) > 0) & (actor_names[0] != ""):
            if not df.empty:
                df["found"] = df[DATA_SIDE_A_COL].apply(
                    lambda x: len(
                        [n for n in actor_names if n in set(x.split(MULTIPLE_SEPARATOR))]
                    )
                    > 0
                ) | df[DATA_SIDE_B_COL].apply(
                    lambda x: len(
                        [n for n in actor_names if n in set(x.split(MULTIPLE_SEPARATOR))]
                    )
                    > 0
                )
    
                df = df.loc[df["found"] == True]

        if (len(start) > 0) and (len(end) > 0):
            df = await anyio.to_thread.run_sync(hf.df_in_period, df, start, end)

        if (len(main_actors) > 0) and (main_actors[0] != ""):
            # get all ids which are relevant
            if len(main_actors) == 1:
                name = main_actors[0]
                ids = await anyio.to_thread.run_sync(af.getEventReportIds, df, name)
            else:
                ids = await anyio.to_thread.run_sync(af.getIdsLink, df, main_actors)
            # transform string ids to int ids
            ids = [int(id) for id in ids]
            # filter dataset by these ids
            by_ids = df.loc[df[DATA_ID_COL].isin(ids)]
        else:
            by_ids = df

        # filter by event types
        if (len(event_types) > 0) & (event_types[0] != ""):
            event_types = [int(tp) for tp in event_types]
            by_events = by_ids.loc[by_ids[DATA_EVENT_TYPE_COL].isin(event_types)]
        else:
            by_events = by_ids

        matched_backgrounds = backgrounds[
            backgrounds["side_a"].isin(main_actors) & backgrounds["side_b"].isin(main_actors)
        ]
        background_data = matched_backgrounds.to_dict(orient="records")
        by_events = by_events[FRONTEND_EVENT_COLS.keys()].rename(
            columns=FRONTEND_EVENT_COLS
        )
        from api.peace_processes import get_full_peace_data, get_res_df
        # peace data filtering
        peace_data_list = []
        if (len(main_actors) == 2) and (main_actors[0] != ""):
            try:
                # Load peace data
                peace_df = await anyio.to_thread.run_sync(get_full_peace_data)
                if peace_df is not None and not peace_df.empty:
                    actor_a, actor_b = main_actors[0], main_actors[1]
                    
                    # Vectorized filtering for performance
                    # Lowercase and strip for robust matching
                    a, b = re.escape(actor_a.strip()), re.escape(actor_b.strip())
                    
                    tp_series = peace_df[PP_THIRD_PARTY_COL].fillna("").astype(str)
                    tps_series = peace_df[PP_THIRD_PARTY_SHORT_COL].fillna("").astype(str)
                    side_a_series = peace_df[DATA_SIDE_A_COL].fillna("").astype(str)
                    side_b_series = peace_df[DATA_SIDE_B_COL].fillna("").astype(str)

                    # Create masks for mediator match (exact or within semicolon-separated list)
                    # We use regex boundaries to avoid partial word matches
                    a_is_mediator = tp_series.str.contains(fr'(?:^|;\s*){a}(?:\s*;|$)', regex=True) | \
                                    tps_series.str.contains(fr'(?:^|;\s*){a}(?:\s*;|$)', regex=True)
                    b_is_mediator = tp_series.str.contains(fr'(?:^|;\s*){b}(?:\s*;|$)', regex=True) | \
                                    tps_series.str.contains(fr'(?:^|;\s*){b}(?:\s*;|$)', regex=True)
                    
                    a_is_side = side_a_series.str.contains(fr'(?:^|,\s*){a}(?:\s*,|$)', regex=True) | \
                                side_b_series.str.contains(fr'(?:^|,\s*){a}(?:\s*,|$)', regex=True)
                    b_is_side = side_a_series.str.contains(fr'(?:^|,\s*){b}(?:\s*,|$)', regex=True) | \
                                side_b_series.str.contains(fr'(?:^|,\s*){b}(?:\s*,|$)', regex=True)

                    mask = (a_is_mediator & b_is_side) | (b_is_mediator & a_is_side)
                    rel_peace_df = peace_df[mask]

                    if not rel_peace_df.empty:
                        peace_data_list = get_res_df(rel_peace_df)
            except Exception as e:
                logger.error(f"Error fetching peace data in reports filter: {e}")
        data = dict(
            event_data=by_events.to_dict(orient="records"),
            background=background_data,
             peace_data= peace_data_list
        )
        return success_response(
            data=data,
            message="Successfully filtered the dataset.",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        print(e)
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
@router.get("/get-available-dates")
async def get_available_dates(gw_number):
    """
    Get all dates available in the data set for the given gw number.

    Args:
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        json: All unique dates for which an entry can be found in the data set grouped by year, month and day.
    """

    try:
        cache_key = f"ged_{gw_number}.csv"
        cached_data = redis_client.get_value(cache_key)
        if cached_data.get("value") is not None:
            data = json.loads(cached_data.get("value"))
            event_dataset = pd.read_json(data, orient="records")

        else:
            logger.info(LOG_CSV_FILE_MSG)
            events_filename =  DATA_DIR+"/"+BY_COUNTRY_DIR+"/"+"ged_"+str(gw_number) + ".csv"
            if not os.path.exists(events_filename):
                return success_response(
                    data=None,
                    message=DATA_NOT_FOUND,
                    status_code=status.HTTP_200_OK,
                )
            event_dataset = await anyio.to_thread.run_sync(hf.prepare_df, events_filename)

        all_list = event_dataset[DATA_DATE_START_COL].tolist()
        available_days = all_list
        data = dict(available_days=available_days)
        return success_response(
            data=data,
            message="Successfully set the current color assignment for link types",
            status_code=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
@router.get("/get-centroid-location")
async def get_centroid_location(gw_number: int):
    """
    Get the centroid coordinates for a country, specified through its Gleditsch + Ward number.

    Args:
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        {lat, long}:        The latitude and longitude coordinates for the country.
    """
    try:
        countries = await anyio.to_thread.run_sync(pd.read_csv, DATA_DIR+"/"+COUNTRIES_GW_FILE)
        relevant = countries.loc[countries["gw_number"] == gw_number]
        longitude = relevant.longitude.item()
        latitude = relevant.latitude.item()

        data = dict(longitude=longitude, latitude=latitude)
        return success_response(
            data=data,
            message="Successfully retrieved country centroid coordinates.",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
@router.get("/get-full-actors")
async def get_full_actors(gw_number: int):
    """
    Get all actors from the ActorPool sorted by the number of events (descending).

    Args:
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        list(dict): All actors in ActorPool serialized to dict instances.
    """
    try:
        
        logger.info(f"get-full-actors..")
        events_filename =  DATA_DIR+"/"+BY_COUNTRY_DIR+"/"+"ged_"+str(gw_number) + ".csv"
        file_exists = await anyio.to_thread.run_sync(os.path.exists, events_filename)
        if not file_exists:
            return success_response(
                data=None,
                message=DATA_NOT_FOUND,
                status_code=status.HTTP_200_OK,
            )
        actors = await anyio.to_thread.run_sync(hf.get_actors, gw_number)
        sorted_actors = sorted(actors.actors, key=lambda x: len(x.events), reverse=True)
        data = [actor.getDict() for actor in sorted_actors]
        return success_response(
            data=data,
            message="Successfully retrieved all actors from the actor pool",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@router.get("/get-data-by-period")
async def get_full_data(start, end, gw_number):
    """
    Get data set with events lying inside the specified period.

    Args:
        start (str):    Indicating the start date for the period.
        end (str):      Indicating the end date for the period.
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        dict: Dictionary only including events marked with a date inside the specified period.
    """

    try:
        logger.info(LOG_CSV_FILE_MSG)
        events_filename = DATA_DIR+"/"+BY_COUNTRY_DIR+"/"+"ged_"+str(gw_number) + ".csv"
        print(events_filename)
        if not os.path.exists(events_filename):
            return success_response(
                data=None,
                message=DATA_NOT_FOUND,
                status_code=status.HTTP_200_OK,
            )
        # Load CSV and filter in a background thread
        event_dataset = await anyio.to_thread.run_sync(hf.prepare_df, events_filename)
        dataset = await anyio.to_thread.run_sync(hf.df_in_period, event_dataset, start, end)
        dataset = dataset[FRONTEND_EVENT_COLS.keys()].rename(columns=FRONTEND_EVENT_COLS)
        data = dict(details=dataset.to_dict(orient="records"))
        return success_response(
            data=data,
            message="Successfully retrieved the dataset with events within the specified period.",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@router.get("/get-link-ids")
async def get_link_ids(actor_names, gw_number):
    """Retrieves link IDs for specified actor names within a conflict dataset."""
    try:
        cache_key = f"ged_{gw_number}.csv"
        cached_data = redis_client.get_value(cache_key)
        if cached_data.get("value") is not None:
            data = json.loads(cached_data.get("value"))
            event_dataset = pd.read_json(data, orient="records")

        else:
            logger.info(LOG_CSV_FILE_MSG)
            events_filename =  DATA_DIR+"/"+BY_COUNTRY_DIR+"/"+"ged_"+str(gw_number) + ".csv"
            event_dataset = await anyio.to_thread.run_sync(hf.prepare_df, events_filename)

        actor_names = actor_names.split(",")
        ids = await anyio.to_thread.run_sync(af.getIdsLink, event_dataset, actor_names)
        data = dict(link_ids=ids)
        return success_response(
            data=data,
            message="Successfully retrieved link IDs for the specified actor names within the conflict dataset.",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
def get_newest_event(df):
    """
    Helper function to get the date of the newest event in a DataFrame.

    Args:
        df (pandas.DataFrame):  The relevant DataFrame.

    Returns:
        str: date of the newest event recorded in the data set.
    """
    try:
        # get newest event
        if len(df[DATA_EVENT_DATE_DT_COL]) > 0:
            newest = max(df[DATA_EVENT_DATE_DT_COL]).strftime("%d. %B %Y")
        else:
            newest = "-"
        return newest
    except Exception as e:
        logger.error(f"Error Results:{e}")

@router.get("/get-period-info")
async def get_period_info(id: int, start: str, end: str, gw_number: int):
    """
    Filter the data set by an actor ID and a period. Collect relevant statistics for the actor detail card.

    Args:
        id (str):           The ID of the relevant actor.
        start (str):        Indicating the start date for the period filter.
        end (str):          Indicating the end date for the period filter.
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        dict: Dictionary including relevant information on the selected actor.
    """
    try:
        
        logger.info(LOG_CSV_FILE_MSG)
        events_filename =  DATA_DIR+"/"+BY_COUNTRY_DIR+"/"+"ged_"+str(gw_number) + ".csv"
        event_dataset = await anyio.to_thread.run_sync(hf.prepare_df, events_filename)
        # get relevant actor(s)
        relevantName = await anyio.to_thread.run_sync(getNameByID, id, gw_number)
        relevantDF = await anyio.to_thread.run_sync(af.getRelevantDF, event_dataset, relevantName)
        # need collaborations, oppositions, number of events, date of last event (period and full)
        relevantPeriod = await anyio.to_thread.run_sync(hf.df_in_period, relevantDF, start, end)
        number_of_events = relevantPeriod.shape[0]
        overall_newest = get_newest_event(relevantDF)
        period_newest = get_newest_event(relevantPeriod)
        collaborations, oppositions = af.get_collabs_oppositions(
            relevantPeriod, relevantName
        )
        # get information on event type distribution
        relevantPeriod["count"] = 1
        event_counts_period = relevantPeriod.groupby([DATA_EVENT_TYPE_COL])[
            "count"
        ].count()
        # scale to percentage
        event_counts_period = event_counts_period / number_of_events
        # make sure all possible event types are present
        all_events = list(event_dataset[DATA_EVENT_TYPE_COL].unique())
        for event in all_events:
            if event not in event_counts_period:
                event_counts_period[event] = 0
        # build and return final result
        result = dict(
            overall_newest=overall_newest,
            period_entries=number_of_events,
            period_newest=period_newest,
            collaborations=collaborations,
            oppositions=oppositions,
            event_counts_period=event_counts_period.sort_index().to_dict(),
        )
        data = dict(data_event=result)
        return success_response(
            data=result,
            message="Successfully filtered data and collected statistics.",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.get("/get-actor-timeline")
async def get_actor_timeline(id: int, gw_number: int):
    """
    Get timeline information about an actor's activity, aggregated by months.

    Args:
        id (str):           The ID of the relevant actor.
        gw_number (int):    The Gleditsch + Ward number of the relevant country.

    Returns:
        Object(str): Mapping from (year, month) to number of events.
    """
    try:
        # get relevant actor(s)
        relevantName = await anyio.to_thread.run_sync(getNameByID, id, gw_number)    
        logger.info(LOG_CSV_FILE_MSG)
        events_filename =  DATA_DIR+"/"+BY_COUNTRY_DIR+"/"+"ged_"+str(gw_number) + ".csv"
        event_dataset = await anyio.to_thread.run_sync(hf.prepare_df, events_filename)
        
        relevantDF = await anyio.to_thread.run_sync(af.getRelevantDF, event_dataset, relevantName)
        # add a column indicating the month of each report to the df
        relevantDF["month"] = relevantDF[DATA_EVENT_DATE_DT_COL].dt.month
        relevantDF["count"] = 1
        # count the number of reports per month
        activity_counts_df = relevantDF.groupby(["year", "month"])["count"].count()
        activity_counts_df = pd.DataFrame(activity_counts_df)

        # convert to dict
        activity_counts_df = activity_counts_df["count"]
        activity_counts = activity_counts_df.T.to_dict()

        if activity_counts:
            minim, maxim = min(activity_counts), max(activity_counts)
            min_year, min_month = minim
            max_year, max_month = maxim

            activity_counts = {
                (year, month): activity_counts.get((year, month), 0)
                for year in range(min_year, max_year + 1)
                for month in range(1, 13)
                if (year > min_year or month >= min_month) and (year < max_year or month <= max_month)
            }

            res = [{"year": y, "month": m, "value": v} for (y, m), v in activity_counts.items()]
        else:
            res = []

        return success_response(
            data=res,
            message="Successfully retrieved actor's activity timeline.",
            status_code=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )