i;
import React from "react";
import { connect } from "react-redux";

import { IReduxState } from "../../app/types";
import { createLocalTracksA } from "../../base/tracks/actions.any";
import { MEDIA_TYPE } from "../../base/media/constants";
import Button from "../../base/ui/components/web/Button";
import { translate } from "../../base/i18n/functions";
import { compose } from "redux";

/**
 * The type of the React {@code Component} props.
 */
interface IProps {
  /**
   * The redux dispatch function.
   */
  dispatch: Function;

  /**
   * The callback to invoke when the permission request has been handled.
   */
  onPermissionHandled: Function;

  /**
   * Used for translation.
   */
  t: Function;
}

/**
 * Component that renders a permission request dialog.
 *
 * @returns {ReactElement}
 */
function PermissionRequestDialog({ dispatch, onPermissionHandled, t }: IProps) {
  const handleClick = () => {
    // This function is executed as a direct result of a user click,
    // so Chrome will show the permission prompt
    dispatch(
      createLocalTracksA({
        devices: [MEDIA_TYPE.AUDIO, MEDIA_TYPE.VIDEO],
      })
    );

    onPermissionHandled();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "5px",
          padding: "20px",
          maxWidth: "500px",
          textAlign: "center",
        }}
      >
        <h2>{t("deepLinking.permissionRequest.title")}</h2>
        <p>{t("deepLinking.permissionRequest.description")}</p>
        <Button
          onClick={handleClick}
          label={t("deepLinking.permissionRequest.button")}
        />
      </div>
    </div>
  );
}

/**
 * Maps (parts of) the Redux state to the associated props.
 *
 * @param {Object} state - The Redux state.
 * @returns {Object}
 */
function mapStateToProps(state: IReduxState) {
  return {};
}

export default compose(
  translate,
  connect(mapStateToProps)
)(PermissionRequestDialog);
