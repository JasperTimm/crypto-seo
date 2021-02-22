import React from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import Button from 'react-bootstrap/Button'
import { Modal, Spinner } from 'react-bootstrap'

export default function ModalDialog(props) {
    return (
      <>
        <Modal show={props.modal.show} onHide={props.handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>{props.modal.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{props.modal.message}</Modal.Body>
          <Modal.Footer>
            {props.modal.secondaryBtn ?
            <Button variant="secondary" onClick={props.handleClose}>
              {props.modal.secondaryBtn.text}
            </Button>
            : <></>}
            {props.modal.primaryBtn ?
            <Button variant="primary" onClick={props.modal.primaryBtn.fn ? props.modal.primaryBtn.fn : props.handleClose}>
              {props.modal.primaryBtn.text}
            </Button>
            : <></>}
            {props.modal.spinner ?
            <Spinner animation="border" />
            : <></>}
          </Modal.Footer>
        </Modal>
      </>
    );
}