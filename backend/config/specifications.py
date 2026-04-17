import os

# column names in events data set
DATA_ID_COL = 'id'
DATA_YEAR_COL = 'year'
DATA_EVENT_TYPE_COL = 'type_of_violence'
DATA_SIDE_A_COL = 'side_a'
DATA_SIDE_B_COL = 'side_b'
DATA_SIDE_A_ID = 'side_a_new_id'
DATA_SIDE_B_ID = 'side_b_new_id'
DATA_SOURCE_DATE = 'source_date'
DATA_SOURCE_REF_COL = 'source_article'
DATA_SOURCE_CONTENT_COL = 'source_headline'
DATA_SOURCE_ORIGIN_COL = 'source_original'
DATA_LOCATION_PREC_COL = 'where_prec'
DATA_LOCATION_NAME_COL = 'where_coordinates'
DATA_LOCATIOM_DETAIL_COL = 'where_description'
DATA_ADM_1_COL = 'adm_1'
DATA_ADM_2_COL = 'adm_2'
DATA_LAT_COL = 'latitude'
DATA_LONG_COL = 'longitude'
DATA_CNTRY_NAME_COL = 'country'
DATA_REGION_COL = 'region'
DATA_DATE_START_COL = 'date_start'
DATA_DATE_END_COL = 'date_end'
DATA_FATALITIES_BEST_COL = 'best'
DATA_EVENT_DATE_DT_COL = 'event_date_dt'
INTERACTION_COL = 'interaction'

# mapping of column names to frontend attributes
FRONTEND_EVENT_COLS = {
    DATA_ID_COL: 'id',
    DATA_YEAR_COL: 'year',
    DATA_EVENT_TYPE_COL: 'event_type',
    DATA_SIDE_A_COL: 'side_a',
    DATA_SIDE_B_COL: 'side_b',
    DATA_SOURCE_REF_COL: 'source_reference',
    DATA_SOURCE_DATE: 'source_date',
    DATA_SOURCE_CONTENT_COL: 'source_content',
    DATA_SOURCE_ORIGIN_COL: 'source_origin',
    DATA_LOCATION_PREC_COL: 'location_precision',
    DATA_LOCATION_NAME_COL: 'location_name',
    DATA_LOCATIOM_DETAIL_COL: 'location_detail',
    DATA_ADM_1_COL: 'admin1',
    DATA_ADM_2_COL: 'admin2',
    DATA_LAT_COL: 'latitude',
    DATA_LONG_COL: 'longitude',
    DATA_CNTRY_NAME_COL: 'country_name',
    DATA_REGION_COL: 'region',
    DATA_DATE_START_COL: 'date_start',
    DATA_DATE_END_COL: 'date_end',
    DATA_EVENT_DATE_DT_COL: 'event_date_dt',
    DATA_FATALITIES_BEST_COL: 'fatalities_best',
    INTERACTION_COL: 'interaction',
}

# column names in actors data set
ACTOR_ID = 'ActorId'
ACTOR_NAME = 'NameData'
ACTOR_ORG = 'Org'

# relevant columns actor data set
ACTOR_REL = [ACTOR_ID, ACTOR_NAME, ACTOR_ORG]

# constants
MULTIPLE_SEPARATOR = ', '
CURRENT_YEAR = 2022

# File Paths (relative to the base lib directory)
DATA_BASE_DIR = 'data'
CONFIG_BASE_DIR = 'config'

BY_COUNTRY_DIR = 'by_country'
ACTORS_DIR = 'actors'

ACTORS_FILE = 'ucdp-actor-241.xlsx'
BACKGROUND_XLSX_FILE = 'backgrounds.xlsx'
EVENT_TYPE_COLOURS = 'eventTypeColours.json'
LINK_TYPE_COLOURS = 'linkTypeColours.json'
COUNTRIES_GW_FILE = 'countries_GW.csv'
FATALITIES_FILE = 'events_fatalities.json'
NEGOTIATIONS_FILE = 'negotiations_agreements.json'
OVERLAY_DIR = 'outlines'
COUNTRIES_SHIP = 'shapefiles/ne_10m_admin_0_countries/ne_10m_admin_0_countries.shp'

# Messages
LOG_CSV_FILE_MSG = 'Data fetched from csv'
INTERNAL_SERVER_ERROR_MSG = 'Something went wrong. Please try again later.'
DATA_NOT_FOUND = "Data not found"

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
FULL_PEACE_DATA = "full_peace_data"

PP_SIDE_A_COL = "side_a"
PP_SIDE_B_COL = "side_b"
PP_THIRD_PARTY_ID_COL = "third_party_id"
PP_THIRD_PARTY_SHORT_COL = "third_party_short"
PP_THIRD_PARTY_COL = "third_party"
PP_MEDIATED_COL = "mediated_negotiations"
PP_NEGOTIATION_ID_COL = "negotiation_id"

