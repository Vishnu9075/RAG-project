from celery import Celery
from database import supabase, s3_client, BUCKET_NAME
import time
from unstructured.partition.pdf import partition_pdf
from unstructured.partition.docx import partition_docx
from unstructured.partition.html import partition_html
from unstructured.chunking.title import chunk_by_title
import os
import tempfile


Celery_app = Celery(
    'document_processor', #Name of our Celery app
    broker="redis://localhost:6379/0", # where tasks are queued
    backend="redis://localhost:6379/0" # where results are stored
    )


def update_status(document_id: str, status: str, details: dict = None):
    """" Update document processing status with optional details """

    #Get current details
    result= supabase.table("project_documents").select("processing_details").eq("id", document_id).execute()

    #start with existing detail or empty dict
    current_details = {}

    if result.data and result.data[0]["processing_details"]:
        current_details = result.data[0]["processing_details"]

    #add new details if provided
    if details:
        current_details.update(details)


    #update document
    supabase.table("project_documents").update({
        "processing_status": status,
        "processing_details": current_details
    }).eq("id", document_id).execute()



@Celery_app.task
def process_document(document_id : str):
    """
    Real document processing 
    
    """
    try:

        doc_result = supabase.table("project_documents").select("*").eq("id", document_id).execute()
        document = doc_result.data[0]

        # step 1 download and partition

        update_status(document_id, "partitioning")

        elements = download_and_partition(document_id, document)

        # step 2 chunk elements
        chunks, chunking_metrics = chunk_elements(elements)
        update_status(document_id, "summarising", {
            "chunking": chunking_metrics
        })

        #step 3 summarising chunks

        #step 4 vectorizing & storing

        return {
            "status" : "success",
            "document_id": document_id
        }
    except Exception as e:
        print(f"ERROR: {e}")




def download_and_partition(document_id: str, document: dict):
    """  Download document form s3 / crawl URl and partion into elements """

    print(f"Downloading and partitioning document {document_id}")

    source_type = document.get("source_type", "file")

    if source_type == "url":
        # crawl URL
        pass

    else:

        # Handle file processing

        s3_key = document["s3_key"]
        filename = document["filename"]
        file_type = filename.split(".")[-1].lower()

        #Download to a temporary loaction

        temp_file = os.path.join(tempfile.gettempdir(), f"{document_id}.{file_type}")
        s3_client.download_file(BUCKET_NAME, s3_key, temp_file)

        elements = partition_document(temp_file, file_type, source_type="file")


    elements_summary = analyze_elements(elements)

    update_status(document_id, "chunking", {
        "partitioning": {
            "elements_found": elements_summary
        }
    })

    os.remove(temp_file)

    return elements


def partition_document(temp_file : str, file_type : str, source_type : str = "file"):
    """ Partition document based on file type and source type """

    if source_type == "url":
        pass

    if file_type == "pdf":

        return partition_pdf(
            filename = temp_file, # path to your PDF files
            strategy = "hi_res", # use most accurate (but slower) processing method of extraction
            infer_table_structure = True, # Keep tables as structured HTML, not jumbled text
            extract_image_block_types = ["Image"], # grab the images found in PDF
            extract_image_block_to_payload = True  # Store the images as base64 data you can actually use
        )


def analyze_elements(elements):
    """" count different types of elements found in the document """

    text_count = 0
    table_count = 0
    image_count = 0
    title_count = 0
    other_count = 0

    for element in elements:
        element_name = type(element).__name__

        if element_name == "Table":
            table_count += 1
        elif element_name == "Image":
            image_count += 1
        elif element_name in ["Title", "Header"]:
            title_count += 1
        elif element_name in ["NarrativeText", "Text", "ListItem", "FigureCaption"]:
            text_count += 1
        else:
            other_count += 1

    return {
        "text": text_count,
        "tables":table_count,
        "images":image_count,
        "titles":title_count,
        "other": other_count
    }


def chunk_elements(elements):
    """ chunk elements using title-based strategy and collect metrics """

    print(" creating smart chunks ")

    chunks = chunk_by_title(
        elements,  # the parsed pdf elemenst from previous step
        max_characters = 3000, # hard limit - never exceed 3000  charaters per chunk
        new_after_n_chars = 2400, # try to start a new chunk after 2400 characters
        combine_text_under_n_chars = 500 # merge tiny chunks under 500 chars with neighbours
    )

    total_chunks = len(chunks)

    chunking_metrics = {
        "total_chunks" : total_chunks
    }

    print( f"created {total_chunks} chunks from {len(elements)} elements")

    return chunks, chunking_metrics