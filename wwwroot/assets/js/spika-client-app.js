(function() {
    
    // handles window ( mainly size change )
    var windowManager = {
        
        init : function(window){
            
            var self = this;
            $(window).resize(function() {
                self.onResize();
            });
            
            this.onResize();
            
        },
        onResize : function(){
            var headerHeight = $('.navbar-static-top').outerHeight();
            var chatboxHeight =  $('#chat_block').outerHeight();
            
            console.log("chat box height" + chatboxHeight);
            $('body').height(window.innerHeight);
            $('#main-view').height(window.innerHeight - headerHeight);
            $('.sidebar-collapse .tab-content').height(window.innerHeight - headerHeight);
            $('#conversation_block').height(window.innerHeight - headerHeight - chatboxHeight - 20);
        }  
        
    };
    
    // handles modal dialogs
    var alertManager = {

        showAlert : function(title,message,buttonText,onClose){
            
            $('#modalAlertDialog #modalTitle').text(title);
            $('#modalAlertDialog #modalText').text(message);
            $('#modalAlertDialog #modalDismissButton').text(buttonText);
            
            $('#modalAlertDialog').modal('show');
            $('#modalAlertDialog').unbind('hide.bs.modal');
            $('#modalAlertDialog').on('hide.bs.modal', function (e) {
                onClose();
            })
        },
        showError : function(message){
            
            $('#modalAlertDialog #modalTitle').text(_lang.labelErrorDialogTitle);
            $('#modalAlertDialog #modalText').text(message);
            $('#modalAlertDialog #modalDismissButton').text(_lang.labelCloseButton);
            
            $('#modalAlertDialog').modal('show');
        },
        showLoading : function(){
            $('#modalLoading').modal('show');
        },
        hideLoading : function(){
            $('#modalLoading').modal('hide');
        },
        showPasswordDialog : function(onEnter,defaultValue){
            
            $('#passwordInputDialog #modalDismissButton').text('OK');
            $('#passwordInputDialog #modalTitle').text('Please input password');
            
            if(_.isUndefined(defaultValue)){
                $('#passwordField').val('');  
            }else{
                $('#passwordField').val(defaultValue);            
            }
            
            $('#passwordInputDialog').modal('show');
            $('#passwordInputDialog').unbind('hide.bs.modal');
            $('#passwordInputDialog').on('hide.bs.modal', function (e) {
                var password = $('#passwordField').val();
                onEnter(password);
            })
            
        }
            
    };
    
    // navigation bar renderer
    var navigationBarManager = {
        
        userList : {},
        groupList : {},
        unreadMessageNumPerUser : {},
        unreadMessageNumPerGroup : {},        
        templateUserRow : _.template('<li><a href="javascript:_chatManager.startPrivateChat(<%= _id %>)"><%= img %><%= name %></a></li>'),
        templateGroupsRow : _.template('<li><a href="javascript:_chatManager.startGroupChat(<%= _id %>)"><%= img %><%= name %></a></li>'),
        avatarImage : _.template('<img src="' + _consts.RootURL + '/api/filedownloader?file=<%= avatar_thumb_file_id %>" alt="" width="40" height="40" class="person_img img-thumbnail" />'),
        avatarNoImage : _.template('<img src="http://dummyimage.com/60x60/e2e2e2/7a7a7a&text=nopicture" alt="" width="40" height="40" class="person_img img-thumbnail" />'),
        templateRecentActivityRowUser : _.template('<li><a href="javascript:_chatManager.startPrivateChat(<%= userId %>)"><%= img %><i class="fa fa-user"></i> <%= name %> <%= count %></a></li>'),
        templateRecentActivityRowGroup : _.template('<li><a href="javascript:_chatManager.startGroupChat(<%= groupId %>)"><%= img %><i class="fa fa-users"></i> <%= name %> <%= count %></a></li>'),
        
        renderContacts : function(userList){
            
            var self = this;
            _spikaClient.getContacts(function(users){
                
                var html = '';
                _.each(users, function(data){
                    
                    if(_.isEmpty(data.avatar_thumb_file_id)){
                        data.img = self.avatarNoImage(data);
                    }else{
                        data.img = self.avatarImage(data);
                    }
                    
                    html += self.templateUserRow(data);
                    
                });
                
                $('#tab-users ul').html(html);
                
                
            },function(errorMessage){
            
                alertManager.showError(_lang.messageGeneralError);
                
            });
            
        },
        renderGroups : function(userList){
        
            var self = this;
            _spikaClient.getFavoriteGroups(function(groups){
                
                var html = '';
                _.each(groups, function(data){

                    if(_.isEmpty(data.avatar_thumb_file_id)){
                        data.img = self.avatarNoImage(data);
                    }else{
                        data.img = self.avatarImage(data);
                    }
                    
                    html += self.templateGroupsRow(data);
                    
                });
                
                $('#tab-groups ul').html(html);
                
            },function(errorMessage){
            
                alertManager.showError(_lang.messageGeneralError);
                
            });
            
        },
        renderRecentActivity : function(userList){
        
            var self = this;
            
            this.userList = {};
            this.groupList = {};
            this.unreadMessageNumPerUser = {};
            this.unreadMessageNumPerGroup = {};   
            
            _spikaClient.getActivitySummary(function(data){

                var html = '';
                var totalUnreadMessage = 0;
                
                var usersId = new Array();
                var groupsId = new Array();
                
                if(data.rows[0].value.recent_activity != undefined){
                
                    if(data.rows[0].value.recent_activity.direct_messages != undefined){
                    
                        var directMessages = data.rows[0].value.recent_activity.direct_messages.notifications;
                        
                        for(index in directMessages){
                            var directMessageRow = directMessages[index];
                            var fromUserId = directMessageRow.messages[0]['from_user_id'];
                            var timestamp = directMessageRow.messages[0]['modified'];
                            var key = timestamp + + fromUserId;
                            
                            usersId.push(fromUserId);
                            
                            if(_.isUndefined(self.unreadMessageNumPerUser[key])){
                                self.unreadMessageNumPerUser[key] = {count:0,userId:fromUserId};
                            }
                            
                            self.unreadMessageNumPerUser[key].count += parseInt(directMessageRow.count);
                            
                        }
                        
                    }
                    
                    if(data.rows[0].value.recent_activity.group_posts != undefined){
                    
                        var groupMessages = data.rows[0].value.recent_activity.group_posts.notifications;

                        for(index in groupMessages){
                            
                            var groupMessageRow = groupMessages[index];
                            var groupId = groupMessageRow['target_id'];
                            var timestamp = groupMessageRow.messages[0]['modified'];
                            var key = groupId;
                            
                            groupsId.push(groupId);
                            
                            if(_.isUndefined(self.unreadMessageNumPerGroup[key])){
                                self.unreadMessageNumPerGroup[key] = {count:0,groupId:groupId};
                            }
                            
                            self.unreadMessageNumPerGroup[key].count += parseInt(groupMessageRow.count);
                            
                        }    
                           
                    }
                }                
                
                usersId = _.uniq(usersId);
                groupsId = _.uniq(groupsId);
                
                _spikaClient.getUser(usersId.join(','),function(data){
                    
                    if(usersId.length == 1){
                        data = [data];
                    }
                    
                    for(userid in data){
                        
                        self.userList[data[userid]['_id']] = data[userid];
                        
                    }
                    
                    _spikaClient.getGroup(groupsId.join(','),function(data){
                        
                        if(groupsId.length == 1){
                            data = [data];
                        }
                        
                        for(groupid in data){
                            
                            self.groupList[data[groupid]['_id']] = data[groupid];
                            
                        }
                        
                        // every information are fetched
                        self.renderRecentActivityNext();
                        
                    },function(errorString){
                        
                        alertManager.hideLoading();
                        
                    });
                
                },function(errorString){
                    
                    alertManager.hideLoading();
                    
                });
                
            },function(errorMessage){
            
                alertManager.showError(_lang.messageGeneralError);
                alertManager.hideLoading();
                
            });
            
        },
        renderRecentActivityNext : function(){
            
            if(_.isEmpty(this.userList)){
                return;
            }
            
            if(_.isEmpty(this.groupList)){
                return;
            }
            
            if(_.isEmpty(this.unreadMessageNumPerUser)){
                return;
            }
            
            if(_.isEmpty(this.unreadMessageNumPerGroup)){
                return;
            }
            
            var html = '';
            
            var keys = _.keys(this.unreadMessageNumPerUser);
            keys = keys.reverse();
            for(var i = 0 ; i < keys.length ; i++){
                
                var key = keys[i];
                var userId = this.unreadMessageNumPerUser[key].userId;
                var count = this.unreadMessageNumPerUser[key].count;
                var data = this.userList[userId];

                if(count > 0){
                    data.count = '(' + count + ')';
                }else{
                    data.count = '';
                }
                 
                if(_.isEmpty(data.avatar_thumb_file_id)){
                    data.img = this.avatarNoImage(data);
                }else{
                    data.img = this.avatarImage(data);
                }
                
                data.userId = userId;
                
                html += this.templateRecentActivityRowUser(data);
                
            }
            
            var keys = _.keys(this.unreadMessageNumPerGroup);
            keys = keys.reverse();
            for(var i = 0 ; i < keys.length ; i++){
                
                var key = keys[i];
                var groupId = this.unreadMessageNumPerGroup[key].groupId;
                var count = this.unreadMessageNumPerGroup[key].count;
                var data = this.groupList[groupId];
                
                if(count > 0){
                    data.count = '(' + count + ')';
                }else{
                    data.count = '';
                }
                 
                if(_.isEmpty(data.avatar_thumb_file_id)){
                    data.img = this.avatarNoImage(data);
                }else{
                    data.img = this.avatarImage(data);
                }
                
                data.groupId = groupId;

                html += this.templateRecentActivityRowGroup(data);
                
                alertManager.hideLoading();
                
            }
            
            $('#tab-recent ul').html(html);
            
        }
        
    }
    
    

    
    // everything for caht
    _chatManager = {
        
        templateDate : _.template('<div class="timestamp_date"><p><%= date %></p></div>'),
        templateChatBlockPerson : _.template('<div class="post_block"><%= conversation %></div>'),
        templateUserInfo : _.template('<div class="person_info"><h5><%= img %><a target="_blank" href="' + _consts.RootURL + '/admin/user/view/<%= from_user_id %>"><%= from_user_name %></a></h5><div class="clear"></div></div>'),
        avatarImage : _.template('<img src="' + _consts.RootURL + '/api/filedownloader?file=<%= avatar_thumb_file_id %>" alt="" width="40" height="40" class="person_img img-thumbnail" />'),
        avatarNoImage : _.template('<img src="http://dummyimage.com/60x60/e2e2e2/7a7a7a&text=nopicture" alt="" width="40" height="40" class="person_img img-thumbnail" />'),
        templatePostHolder : _.template('<div class="post userId<%= user_id %>" id="message<%= message_id %>" messageid="<%= message_id %>"><div class="timestamp"><%= deleteicon %> <%= unreadicon %> <%= time %></div><%= content %></div>'),
        templateDeleteIcon : _.template('<button type="button" class="btn btn-link deleteIcon" data-toggle="tooltip" data-placement="left" title="<%= deletetime %>"><i class="fa fa-trash-o text-danger"></i></button>'),
        templateUnreadIcon : _.template('<i class="fa fa-envelope-o"></i>'),
        templateTextPost : _.template('<div class="post_content" messageid="<%= _id %>"><%= body %></div>'),
        templatePicturePost : _.template('<div class="post_content" messageid="<%= _id %>"><a class="img-thumbnail" data-toggle="modal" data-target=".bs-example-modal-lg<%= _id  %>"><img src="' + _consts.RootURL + '/api/filedownloader?file=<%= picture_thumb_file_id %>" height="120" width="120" /></a></div></div><div class="modal fade bs-example-modal-lg<%= _id %>" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true"><div class="modal-dialog modal-lg"><div class="modal-content"><img src="' + _consts.RootURL + '/api/filedownloader?file=<%= picture_file_id %>" /></div></div>'),
        templateEmoticonPost : _.template('<div class="post_content" messageid="<%= _id %>"><img src="<%= emoticon_image_url %>" height="120" width="120" /></div>'),
        templateVoicePost : _.template('<div class="fa fa-play-circle-o fa-4x post_fa"></div><div class="post_content post_media" messageid="<%= _id %>"><%= body %><br /><audio controls><source src="' + _consts.RootURL + '/api/filedownloader?file=<%= voice_file_id %>" width="50" type="audio/wav"><a target="_blank" href="' + _consts.RootURL + '/api/filedownloader?file=<%= voice_file_id %>">' + _lang.listenVoice + '</a></audio></div>'),
        templateVideoPost : _.template('<div class="fa fa-video-camera fa-4x post_fa"></div><div class="post_content post_media" messageid="<%= _id %>"><%= body %><br /><a target="_blank" href="' + _consts.RootURL + '/api/filedownloader?file=<%= video_file_id %>">' + _lang.watchVideo + '</a></div>'),
        templateLocationPost : _.template('<div class="fa fa-location-arrow fa-4x post_fa"></div><div class="post_content post_media" messageid="<%= _id %>"><%= body %><br /><a target="_blank" href="http://maps.google.com/?q=<%= latitude %>,<%= longitude %>">' + _lang.openInGoogleMap + '</a></div>'),
        chatPageRowCount : 30,
        chatCurrentPage : 1,
        chatCurrentUserId : 0,
        chatCurrentGroupId : 0,
        chatContentPool : [],
        isLoading : false,
        isReachedToEnd : false,
        init : function(){
            
            var self = this;
            this.chatContentPool = [];
            
            $("#conversation_block").scroll(function() {
                
                var scrollPosition = $(this).scrollTop();
                
                if(scrollPosition == 0){
                    
                    if(self.isLoading == false){
                        self.isLoading = true;
                        self.loadNextPage();
                    }else{
                        
                    }
                                        
                }
                                
            });

        },
        loadNextPage : function(){
            
            if(this.isReachedToEnd)
                return;
                
            var self = this;
            this.chatCurrentPage++;
            
            var lastHeight = $("#conversation_block")[0].scrollHeight;
            
            if(this.chatCurrentUserId != 0){
            
                _spikaClient.loadUserChat(this.chatCurrentUserId,this.chatPageRowCount,this.chatCurrentPage,function(data){
                    self.mergeConversation(data);
                    self.render();
                    self.isLoading = false;
                    
                    var currentHeight = $("#conversation_block")[0].scrollHeight;
                                     
                    $("#conversation_block").scrollTop(currentHeight - lastHeight);
                    
                },function(errorString){
    
                });
                
            }
            
            else if(this.chatCurrentGroupId != 0){
                
                _spikaClient.loadGroupChat(this.chatCurrentGroupId,this.chatPageRowCount,this.chatCurrentPage,function(data){
                    self.mergeConversation(data);
                    self.render();
                    self.isLoading = false;

                    var currentHeight = $("#conversation_block")[0].scrollHeight;
                    
                    $("#conversation_block").scrollTop(currentHeight - lastHeight);


                },function(errorString){
    
                });
                
            }
            
        },
        resetChat : function(){
        
            console.log('reset chat');
            
            if(this.chatCurrentUserId != 0){
                
                this.startPrivateChat(this.chatCurrentUserId);
                
            } else if(this.chatCurrentGroupId != 0){
                
                this.startGroupChat(this.chatCurrentGroupId);
                
            }

        },
        startPrivateChat : function(userId){
            
            var self = this;
            
            alertManager.showLoading();
            
            this.chatCurrentUserId = userId;
            this.chatCurrentGroupId = 0;
            this.chatCurrentPage = 1;
            this.chatContentPool = [];
            
            self.isLoading = true;
            
            _spikaClient.loadUserChat(userId,this.chatPageRowCount,this.chatCurrentPage,function(data){
                
                sideBarManager.renderUserProfile(userId);
                
                alertManager.hideLoading();

                self.mergeConversation(data);
            
                self.render();
                
                self.scrollToBottom();
                
                self.isLoading = false;
                
            },function(errorString){
            
                alertManager.hideLoading();
                
                alertManager.showError(_lang.messageGeneralError);
            
            });
            
        },
        startGroupChat : function(groupId){
            
            var self = this;
            
            alertManager.showLoading();
            
            this.chatCurrentGroupId = groupId;
            this.chatCurrentUserId = 0;
            this.chatCurrentPage = 1;
            this.chatContentPool = [];
            
            self.isLoading = true;
            
            var cookieKey = "groupPassword" + groupId;
            
            // check password
            _spikaClient.getGroup(groupId,function(data){
                
                if(!_.isEmpty(data.group_password)){
        
                    var savedPassword = Cookies(cookieKey);                
                    
                    console.log(savedPassword);
                          
                    alertManager.showPasswordDialog(function(password){
                        
                        var hash = CryptoJS.MD5(password);
                        
                        console.log(hash.toString().toLowerCase());
                        console.log(data.group_password.toString().toLowerCase());
                        
                        if(hash.toString().toLowerCase() == data.group_password.toString().toLowerCase()){
                            
                            // save to cookie
                            Cookies(cookieKey, password);
                            
                            self.enterToGroupChat(groupId);
                            
                        }else{
                            
                            alertManager.hideLoading();
                            _.delay(function(){
                                alertManager.showError('invalid password');
                            }, 500) 

                        }
                        
                    },savedPassword);
                       
                }else{
                    
                    self.enterToGroupChat(groupId);
                    
                }

                
            },function(errorString){
            
                alertManager.hideLoading();
                alertManager.showError(_lang.messageGeneralError);
            
            });
            

               
        },
        enterToGroupChat : function(groupId){
            
            var self = this;
            
            _spikaClient.loadGroupChat(groupId,this.chatPageRowCount,this.chatCurrentPage,function(data){
                
                sideBarManager.renderGroupProfile(groupId);

                alertManager.hideLoading();
                
                self.mergeConversation(data);
                
                self.render();
                
                self.scrollToBottom();
                
                self.isLoading = false;
                
            },function(errorString){
            
                alertManager.hideLoading();
                
                alertManager.showError(_lang.messageGeneralError);
            
            });
            
        },
        mergeConversation : function(data){
            
            if(data.rows.length < this.chatPageRowCount){
                this.isReachedToEnd = true;
            }
            
            var oldPool = [];
            
            for(index in this.chatContentPool){
                var row = this.chatContentPool[index];
                oldPool[row._id] = row;
            }
            
            for(index in data.rows){
                
                var row = data.rows[index];

                if(_.isUndefined(row.value)){
                    continue;
                }
                
                oldPool[row.value._id] = row.value;
                
            }
            
            var tmpAry = _.sortBy(oldPool, function(message){ 
                return message.created 
            });
            
            this.chatContentPool = [];
            
            for(var index in oldPool){
                this.chatContentPool.push(oldPool[index]);
            }
            
        },
        
        render : function(){
            
            var html = '';
            
            var lastFromUserId = 0;
            var lastDateStr = '';
            var userPostsHtml = '';
            var lastRow = null;
            
            for(var index = 0 ; index < _.size(this.chatContentPool) ; index++){
                
                var row = this.chatContentPool[index];
                var date = new Date(row.created*1000);
                var dateStr = (date.getYear() + 1900)  + "." + (date.getMonth() + 1) + "." + date.getDate();
                var hour = date.getHours();
                var min = date.getMinutes();
                
                if(hour < 10)
                    hour = '0' + hour;
                    
                if(min < 10)
                    min = '0' + min;
                    
                var timeStr = hour + ":" + min;
                var fromuserId = row.from_user_id;
                
                if(lastFromUserId == 0)
                    lastFromUserId = fromuserId;
                             
                row.time = timeStr;
                row.date = dateStr;
                
                var messageType = row.message_type;
                
                if(_.isEmpty(row.avatar_thumb_file_id)){
                    row.img = this.avatarNoImage(row);
                }else{
                    row.img = this.avatarImage(row);
                }

                if(lastDateStr != dateStr || lastDateStr == ''){
                
                    if(userPostsHtml != ''){
                        userPostsHtml = this.templateUserInfo(lastRow) + userPostsHtml;
                        html += this.templateChatBlockPerson({conversation:userPostsHtml});
                        userPostsHtml = '';
                    }

                    html += this.templateDate({date:dateStr});
                    
                } else if(lastFromUserId != fromuserId){
                    userPostsHtml = this.templateUserInfo(lastRow) + userPostsHtml;
                    html += this.templateChatBlockPerson({conversation:userPostsHtml});
                    userPostsHtml = '';
                }
                
                var postHtml = '';
                
                if(messageType == 'location'){
                    postHtml = this.templateLocationPost(row);
                }else if(messageType == 'video'){
                    postHtml = this.templateVideoPost(row);
                }else if(messageType == 'voice'){
                    postHtml = this.templateVoicePost(row);
                }else if(messageType == 'emoticon'){
                    postHtml = this.templateEmoticonPost(row);
                }else if(messageType == 'image'){
                    postHtml = this.templatePicturePost(row);
                }else{
                    row.body = row.body.autoLink();
                    postHtml = this.templateTextPost(row);
                }
                
                var deleteIconHtml = '';
                
                if(row.delete_at != 0){
                    var deleteText = generateDeleteText(row.delete_at);
                    deleteIconHtml = this.templateDeleteIcon({deletetime:deleteText});
                }
                
                if(row.delete_after_shown != 0){
                    var deleteText = "After read";
                    deleteIconHtml = this.templateDeleteIcon({deletetime:deleteText});
                }
                
                var unreadIcon = '';
                
                if(row.read_at == 0 && _spikaClient.currentUser._id == row.from_user_id){
                    unreadIcon = this.templateUnreadIcon();
                }
                
                userPostsHtml += this.templatePostHolder({
                    content : postHtml,
                    time : timeStr,
                    user_id : row.from_user_id,
                    message_id : row._id,
                    deleteicon : deleteIconHtml,
                    unreadicon : unreadIcon
                });
                
                lastDateStr = dateStr;               
                lastRow = _.clone(row);
                lastFromUserId = fromuserId;
                
            }
            
            userPostsHtml = this.templateUserInfo(lastRow) + userPostsHtml;
            html += this.templateChatBlockPerson({conversation:userPostsHtml});

            $('#conversation_block').html(html);
            $('.deleteIcon').tooltip();

            
            var className = ".userId" + _spikaClient.currentUser._id;
            
            for(var index = 0 ; index < _.size(this.chatContentPool) ; index++){
            
                var row = this.chatContentPool[index];
                
                if(_spikaClient.currentUser._id == row.from_user_id){
                    
                    var postRowSelector = "#message" + row._id;
                    
                    $(postRowSelector).contextMenu({
                    
                        menuSelector: "#contextMenu",
                        menuSelected: function (invokedOn, selectedMenu) {
                                                        
                            var deleteMessageId = invokedOn.attr('messageid');
                            var deleteType = selectedMenu.attr('tabindex');
                            
                            if(!_.isUndefined(deleteMessageId) && 
                                !_.isEmpty(deleteType) && 
                                !_.isUndefined(deleteMessageId) && 
                                !_.isEmpty(deleteType)){
                                    
                                    _chatManager.deleteMessage(deleteMessageId,deleteType);
                                    
                            }
                            
                        },
                    }); 
                    
                    // change cursor of my messages 
                    $(postRowSelector).css('cursor','pointer');
                    
                }
                             
            }
            
   
            $(".post").hover(function(){
                $(this).css('background-color','#e5e5e5');
            },function(){
                $(this).css('background-color','#fff');
            });
   
        },
        isInConversation : function(){
        
            if(this.chatCurrentUserId != 0) {
                return true;
            } else if(this.chatCurrentGroupId != 0) {
                return true;
            } else {
                return false;
            }
            
            return false;
        },
        sendTextMessage : function(message){
            
            var self = this;
            var targetId = 0;
            var target = '';
            
            if(self.chatCurrentUserId != 0) {
                targetId = self.chatCurrentUserId;
                target = _spikaClient.MESSAGE_TAEGET_USER;
            } else if(self.chatCurrentGroupId != 0) {
                targetId = self.chatCurrentGroupId;
                target = _spikaClient.MESSAGE_TAEGET_GROUP;
            } else {
                $('#btn-chat-send').html('Send');
                $('#btn-chat-send').removeAttr('disabled');
                
                return;
            }
            
            _spikaClient.postTextMessage(target,targetId,message,function(data){
                
                $('#btn-chat-send').html('Sent');
                
                self.loadNewMessage();

                _.delay(function(){
                    $('#btn-chat-send').html('Send');
                    $('#btn-chat-send').removeAttr('disabled');
                }, 1000);
                                        
            },function(errorString){
            
                alertManager.showError(_lang.messageGeneralError);
                
            });
                
        },
        sendMediaMessage : function(file,mediaType,listener){
            
            var self = this;
            var targetId = 0;
            var target = '';
            
            if(self.chatCurrentUserId != 0) {
                targetId = self.chatCurrentUserId;
                target = _spikaClient.MESSAGE_TAEGET_USER;
            } else if(self.chatCurrentGroupId != 0) {
                targetId = self.chatCurrentGroupId;
                target = _spikaClient.MESSAGE_TAEGET_GROUP;
            }else {
                $('#btn-chat-send').html('Send');
                $('#btn-chat-send').removeAttr('disabled');
                
                return;
            }
            
            if(mediaType == _spikaClient.MEDIA_TYPE_IMAGE){
                // scale
                resize(file,640,640,100,"image/jpeg",function(blobBigImage){
                    
                    resize(file,240,240,100,"image/jpeg",function(blobSmallImage){
                    
                        _spikaClient.fileUpload(blobBigImage,function(data){
                            
                            var fileId = data;
                            
                            _spikaClient.fileUpload(blobSmallImage,function(data){
                                
                                var thumbId = data;
                                
                                _spikaClient.postMediaMessage(target,mediaType,targetId,fileId,thumbId,function(data){
                                    
                                    $('#btn-chat-send').html('Sent');
                                    
                                    self.loadNewMessage();
                                    listener();
                                    
                                    _.delay(function(){
                                        $('#btn-chat-send').html('Send');
                                        $('#btn-chat-send').removeAttr('disabled');
                                    }, 1000);
                    
                                },function(errorString){
                                
                                    alertManager.showError(_lang.messageGeneralError);
                                    listener();
                                    
                                }); // post message
                                                        
                            },function(errorString){
                            
                                alertManager.showError(_lang.messageGeneralError);
                                listener();
                                
                            });// upload thumb
    
                                                    
                        },function(errorString){
                        
                            alertManager.showError(_lang.messageGeneralError);
                            listener();
                            
                        });// upload image
                    
                    }); // generate thumb
                
                }); // scale image
            }
            
            if(mediaType == _spikaClient.MEDIA_TYPE_VIDEO || mediaType == _spikaClient.MEDIA_TYPE_AUDIO){
                
                _spikaClient.fileUpload(file,function(data){
                    
                    var fileId = data;
                    
                    _spikaClient.postMediaMessage(target,mediaType,targetId,fileId,0,function(data){
                        
                        $('#btn-chat-send').html('Sent');
                        
                        self.loadNewMessage();
                        listener();
                        
                        _.delay(function(){
                            $('#btn-chat-send').html('Send');
                            $('#btn-chat-send').removeAttr('disabled');
                        }, 1000);
        
                    },function(errorString){
                    
                        alertManager.showError(_lang.messageGeneralError);
                        listener();
                        
                    }); // post message
                                            
                },function(errorString){
                
                    alertManager.showError(_lang.messageGeneralError);
                    listener();
                    
                });// upload thumb

                
            }
                        

                
        },
        sendSticker : function(stickerIdentifier,listener){

            var self = this;
            var targetId = 0;
            var target = '';
            
            if(self.chatCurrentUserId != 0) {
                targetId = self.chatCurrentUserId;
                target = _spikaClient.MESSAGE_TAEGET_USER;
            } else if(self.chatCurrentGroupId != 0) {
                targetId = self.chatCurrentGroupId;
                target = _spikaClient.MESSAGE_TAEGET_GROUP;
            } else {
                $('#btn-chat-send').html('Send');
                $('#btn-chat-send').removeAttr('disabled');
                
                return;
            }
            
            _spikaClient.postStickerMessage(target,targetId,stickerIdentifier,function(data){
                
                $('#btn-chat-send').html('Sent');
                
                self.loadNewMessage();
                
                _.delay(function(){
                    $('#btn-chat-send').html('Send');
                    $('#btn-chat-send').removeAttr('disabled');
                }, 1000);
                
                listener();
                
            },function(errorString){
            
                alertManager.showError(_lang.messageGeneralError);
                listener();
                
            }); // post message
            
        },
        
        scrollToBottom : function(){
            var objConversationBlock = $('#conversation_block');
            var height = objConversationBlock[0].scrollHeight;
            objConversationBlock.scrollTop(height);
        },
        loadNewMessage : function(){

            var self = this;
            
            if(self.chatCurrentUserId != 0){
                
                this.isLoading = true;
                
                _spikaClient.loadUserChat(self.chatCurrentUserId,self.chatPageRowCount,1,function(data){
                    self.mergeConversation(data);
                    self.render();
                    self.scrollToBottom();
                },function(errorString){
    
                });
                
            } else if(self.chatCurrentGroupId != 0){
                
                this.isLoading = true;
                
                _spikaClient.loadGroupChat(self.chatCurrentGroupId,self.chatPageRowCount,1,function(data){
                    self.mergeConversation(data);
                    self.render();
                    self.scrollToBottom();
                },function(errorString){
    
                });
            }
            
        },
        deleteMessage : function(messageId,deleteType){
            
            _spikaClient.setDelete(messageId,deleteType,function(data){
                
                console.log(_chatManager);
                
                _chatManager.resetChat();
                
            },function(errorString){
                
                console.log(errorString);
                
            });
                
        }
            
    };
    
    // see new messages
    var newMessageChecker = {
        
        lastModified : 0,
        lastUnreadMessageCount : 0,
        checkInterval : 1000, // ms
        startUpdating : function(){
            
            var self = this;
            
            this.checkUpdate();
            
            _.delay(function(){
                self.checkUpdate();
            }, this.checkInterval);

        },
        checkUpdate : function(){
            
            var self = this;
            var isUpdateNeed = false;
            var unreadMessageCount = 0;

            _spikaClient.getActivitySummary(function(data){
                
                if(self.lastModified == 0)
                    alertManager.hideLoading();
                    
                if(data.rows[0].value.recent_activity != undefined){
                
                    if(data.rows[0].value.recent_activity.direct_messages != undefined){
                    
                        var directMessages = data.rows[0].value.recent_activity.direct_messages.notifications;      
                                          
                        for(index in directMessages){
                        
                            directMessageRow = directMessages[index];
                            timestamp = directMessageRow.messages[0]['modified'];
                            
                            if(timestamp > self.lastModified){
                                isUpdateNeed = true;
                                self.lastModified = timestamp;
                                
                                if(_chatManager.chatCurrentUserId == directMessageRow.messages[0]['from_user_id']){
                                     _chatManager.loadNewMessage();
                                }
                                   
                            }
                            
                            unreadMessageCount+=parseInt(directMessageRow.count);
                        }
                        
                    }
                    
                    if(data.rows[0].value.recent_activity.group_posts != undefined){
                    
                        var groupMessages = data.rows[0].value.recent_activity.group_posts.notifications;
                        
                        for(index in groupMessages){
                        
                            groupMessagesRow = groupMessages[index];
                            timestamp = groupMessagesRow.messages[0]['modified'];
                            
                            if(timestamp > self.lastModified){
                                isUpdateNeed = true;
                                self.lastModified = timestamp;
                                
                                if(_chatManager.chatCurrentGroupId == groupMessagesRow['target_id'])
                                    _chatManager.loadNewMessage();
                            }
                            
                            unreadMessageCount+=parseInt(groupMessagesRow.count);
                            
                        }    
                           
                    }
                }
                
                if(self.unreadMessageCount != unreadMessageCount)
                    isUpdateNeed = true;
                    
                self.unreadMessageCount = unreadMessageCount;
                
                if(isUpdateNeed){
                    navigationBarManager.renderRecentActivity();
                }
                
                _.delay(function(){
                    self.checkUpdate();
                }, self.checkInterval);
                
                if(self.unreadMessageCount > 0)
                    document.title = _lang.clientSiteTitle + ' (' + self.unreadMessageCount + ')';
                else
                    document.title = _lang.clientSiteTitle;
                
            },function(errorMessage){
            
                alertManager.hideLoading();
                
            });
            
        }
          
    };
    
    // render side bar
    var sideBarManager = {

        templateUserProflie : _.template('<div class="panel panel-primary profile-panel"><div class="panel-heading"> Profile </div><div class="panel-body"><div class="person_detail"><span id="profile-picture"><%= img %></span><br /><span id="profile-name"><%= name %></span><br /><a href="' + _consts.RootURL + '/admin/user/view/<%= _id %>">See Profile</a></div><div id="profile-description"><%= about %></div></div><div class="panel-footer"></div></div>'),
        templateGroupProflie : _.template('<div class="panel panel-primary profile-panel"><div class="panel-heading"> Profile </div><div class="panel-body"><div class="person_detail"><span id="profile-picture"><%= img %></span><br /><span id="profile-name"><%= name %></span><br /><a href="' + _consts.RootURL + '/admin/group/view/<%= _id %>">See Profile</a></div><div id="profile-description"><%= description %></div></div><div class="panel-footer"></div></div>'),
        avatarImage : _.template('<img src="' + _consts.RootURL + '/api/filedownloader?file=<%= avatar_thumb_file_id %>" alt="" width="240" height="240" class="person_img img-thumbnail" />'),
        avatarNoImage : _.template('<img src="http://dummyimage.com/60x60/e2e2e2/7a7a7a&text=nopicture" alt="" width="240" height="240" class="person_img img-thumbnail" />'),

        renderUserProfile : function(userId){
            
            var self = this;
            
            _spikaClient.getUser(userId,function(data){

                var html = '';
                 
                if(_.isEmpty(data.avatar_file_id)){
                    data.img = self.avatarNoImage(data);
                }else{
                    data.img = self.avatarImage(data);
                }

                html += self.templateUserProflie(data);
                
                $('#sidebar_block').html(html);
                
            },function(errorString){
                
                alertManager.hideLoading();
                
            });

            
        },
        renderGroupProfile : function(groupId){
            
            var self = this;
            
            _spikaClient.getGroup(groupId,function(data){

                var html = '';
                 
                if(_.isEmpty(data.avatar_file_id)){
                    data.img = self.avatarNoImage(data);
                }else{
                    data.img = self.avatarImage(data);
                }
                

                html += self.templateGroupProflie(data);
                
                $('#sidebar_block').html(html);
                
            },function(errorString){
                
                alertManager.hideLoading();
                
            });

            
        }
        
        
    };
    
    var fileUploadManager = {
        handleFileSelect : function(event){
            
            event.preventDefault();
            
            var files = event.dataTransfer.files;
            
            if(_.isUndefined(files)){
                return;
            }
            
            var filesCount = files.length;
            
            if(filesCount > 1){
                alertManager.showError(_lang.messageValidationErrorTooManyFiles);
                return;
            }
            
            var file = files[0];
            var fileType = file.type;
            
            if(fileType != 'image/jpeg' && fileType != 'image/pjpeg' && fileType != 'video/mp4' && fileType != 'audio/mp3' && fileType != 'audio/mpeg'){
                alertManager.showError(_lang.messageValidationErrorWrongFileType);
                return;
            }
            
            if(!_chatManager.isInConversation()){
                return;
            }
            
            // upload
            $('#fileupload-box').css('display','none');
            $('#fileuploading').css('display','block');
            
            $('#btn-chat-send').attr('disabled','disabled');
            
            
            if(fileType == 'image/jpeg' || fileType == 'image/pjpeg'){
                _chatManager.sendMediaMessage(file,_spikaClient.MEDIA_TYPE_IMAGE,function(){
                    $('#fileupload-box').css('display','block');
                    $('#fileuploading').css('display','none');
                });
            }

            if(fileType == 'video/mp4'){
                _chatManager.sendMediaMessage(file,_spikaClient.MEDIA_TYPE_VIDEO,function(){
                    $('#fileupload-box').css('display','block');
                    $('#fileuploading').css('display','none');
                });
            }
                        
            if(fileType == 'audio/mp3' || fileType == 'audio/mpeg'){
                _chatManager.sendMediaMessage(file,_spikaClient.MEDIA_TYPE_AUDIO,function(){
                    $('#fileupload-box').css('display','block');
                    $('#fileuploading').css('display','none');
                });
            }
                        
        },
        handleDragOver : function(event){
            event.preventDefault();
            $('#fileupload-box').css('border-color','#f88');
        },
        handleDragLeave : function(event){
            event.preventDefault();
            $('#fileupload-box').css('border-color','#888');
        }
    };
    
    var stickerViewManager = {
        templateSticker : _.template('<li class="sticker-view" stickerId="<%= identifier %>"><img src="<%= stickerUrl %>" alt="" width="120" height="120" /></li>'),    
        sending : false,
        render : function(){
            
            var self = this;
            
            _spikaClient.loadStickers(function(data){

                if(!_.isArray(data.rows))
                    return;
                
                var html = '';
                
                _.each(data.rows,function(row,key,list){
                    
                    var value = row.value;
                    
                    if(_.isUndefined(value))
                        return;
                    
                    value.stickerUrl =  _consts.RootURL + "/api/Emoticon/" + value._id;
                    html += self.templateSticker(value);
                          
                });
                
                $('#sticker-holder').html(html);
                
                $('#sticker-holder').css('width',130 * data.rows.length);
                
                $('.sticker-view').click(function(){

                    if(!_chatManager.isInConversation()){
                        return;
                    }
            
                    var stickerIdentifier = $(this).attr('stickerId');
                    
                    if(!_.isUndefined(stickerIdentifier)){
                        
                        if(self.sending == true)
                            return;
                            
                        self.sending = true;
                        $('.sticker-view').css('cursor','progress');
                        
                        _chatManager.sendSticker(stickerIdentifier,function(){
                            self.sending = false;
                            $('.sticker-view').css('cursor','pointer');
                        });

                        $('#btn-chat-send').html('<i class="fa fa-refresh fa-spin"></i> Sending');
                        $('#btn-chat-send').attr('disabled','disabled');
                        
                    }
                    
                });
                               

            },function(errorString){
                
                
            });
            
        }
    };
    
    $(document).ready(function() {
    
        alertManager.showLoading();
        
        windowManager.init(window);
        _chatManager.init();
        
        // login
        _spikaClient.login(_loginedUser.email,_loginedUser.password,function(data){
            
            _loginedUser = data;
            _spikaClient.setCurrentUser(_loginedUser);
                        
            navigationBarManager.renderContacts();
            navigationBarManager.renderGroups();
            
            newMessageChecker.startUpdating();
            
            if(_targetUserId != 0){
                _chatManager.startPrivateChat(_targetUserId);                
            }else if(_targetGroupId != 0){
                _chatManager.startGroupChat(_targetGroupId);                
            }
            
            stickerViewManager.render();

        },function(errorString){
        
            alertManager.showAlert(_lang.labelErrorDialogTitle,_lang.messageTokenError,_lang.labelCloseButton,function(){
                location.href = "login";
            });
            
        });
        
        $('#btn-chat-send').click(function(){
            
            if(!_chatManager.isInConversation()){
                return;
            }
            
            _chatManager.sendTextMessage($('#textarea').val());
            $('#textarea').val('');
            $('#btn-chat-send').html('<i class="fa fa-refresh fa-spin"></i> Sending');
            $('#btn-chat-send').attr('disabled','disabled');
            
        });
        
        $('#btn_text').click(function(){
            $('#textarea').css('display','block');
            $('#sticker').css('display','none');
            $('#fileupload').css('display','none');
             
        });
        $('#btn_sticker').click(function(){
            $('#textarea').css('display','none');
            $('#sticker').css('display','block');
            $('#fileupload').css('display','none');
             
        });
        $('#btn_file').click(function(){
            $('#textarea').css('display','none');
            $('#sticker').css('display','none');
            $('#fileupload').css('display','block');
            $('#fileupload-box').css('display','block');
            $('#fileuploading').css('display','none');
        });
        
        // file dropzone setup
        var dropZone = document.getElementById('fileupload-box');
        dropZone.addEventListener('dragleave', fileUploadManager.handleDragLeave, false);
        dropZone.addEventListener('dragover', fileUploadManager.handleDragOver, false);
        dropZone.addEventListener('drop', fileUploadManager.handleFileSelect , false);
        
    });

})();
